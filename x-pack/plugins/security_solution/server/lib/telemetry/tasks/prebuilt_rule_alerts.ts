/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import type { ESClusterInfo, ESLicense, TelemetryEvent } from '../types';
import type { TaskExecutionPeriod } from '../task';
import { TELEMETRY_CHANNEL_DETECTION_ALERTS } from '../constants';
import { batchTelemetryRecords, tlog } from '../helpers';
import { copyAllowlistedFields, prebuiltRuleAllowlistFields } from '../filterlists';

export function createTelemetryPrebuiltRuleAlertsTaskConfig(maxTelemetryBatch: number) {
  return {
    type: 'security:telemetry-prebuilt-rule-alerts',
    title: 'Security Solution - Prebuilt Rule and Elastic ML Alerts Telemetry',
    interval: '1h',
    timeout: '5m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      try {
        const [clusterInfoPromise, licenseInfoPromise] = await Promise.allSettled([
          receiver.fetchClusterInfo(),
          receiver.fetchLicenseInfo(),
        ]);

        const clusterInfo =
          clusterInfoPromise.status === 'fulfilled'
            ? clusterInfoPromise.value
            : ({} as ESClusterInfo);
        const licenseInfo =
          licenseInfoPromise.status === 'fulfilled'
            ? licenseInfoPromise.value
            : ({} as ESLicense | undefined);

        const { events: telemetryEvents, count: totalPrebuiltAlertCount } =
          await receiver.fetchPrebuiltRuleAlerts();

        sender.getTelemetryUsageCluster()?.incrementCounter({
          counterName: 'telemetry_prebuilt_rule_alerts',
          counterType: 'prebuilt_alert_count',
          incrementBy: totalPrebuiltAlertCount,
        });

        if (telemetryEvents.length === 0) {
          tlog(logger, 'no prebuilt rule alerts retrieved');
          return 0;
        }

        const processedAlerts = telemetryEvents.map(
          (event: TelemetryEvent): TelemetryEvent =>
            copyAllowlistedFields(prebuiltRuleAllowlistFields, event)
        );

        const enrichedAlerts = processedAlerts.map(
          (event: TelemetryEvent): TelemetryEvent => ({
            ...event,
            licence_id: licenseInfo?.uid,
            cluster_uuid: clusterInfo?.cluster_uuid,
            cluster_name: clusterInfo?.cluster_name,
          })
        );

        tlog(logger, `sending ${enrichedAlerts.length} elastic prebuilt alerts`);
        const batches = batchTelemetryRecords(enrichedAlerts, maxTelemetryBatch);
        for (const batch of batches) {
          await sender.sendOnDemand(TELEMETRY_CHANNEL_DETECTION_ALERTS, batch);
        }

        return enrichedAlerts.length;
      } catch (err) {
        logger.error('could not complete prebuilt alerts telemetry task');
        return 0;
      }
    },
  };
}
