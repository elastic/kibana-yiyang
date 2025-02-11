/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Ping } from '../../../../../../common/runtime_types';
import { testNowMonitorAction } from '../../../../state/actions';
import { testNowRunSelector, TestRunStats } from '../../../../state/reducers/test_now_runs';
import * as labels from '../translations';

export const TestNowColumn = ({
  monitorId,
  configId,
  selectedMonitor,
}: {
  monitorId: string;
  configId?: string;
  selectedMonitor: Ping;
}) => {
  const dispatch = useDispatch();

  const testNowRun = useSelector(testNowRunSelector(configId));

  if (selectedMonitor.monitor.fleet_managed) {
    return (
      <EuiToolTip content={labels.PRIVATE_AVAILABLE_LABEL}>
        <>--</>
      </EuiToolTip>
    );
  }

  if (!configId) {
    return (
      <EuiToolTip content={labels.TEST_NOW_AVAILABLE_LABEL}>
        <>--</>
      </EuiToolTip>
    );
  }

  const testNowClick = () => {
    dispatch(testNowMonitorAction.get(configId));
  };

  const isTestNowLoading = testNowRun && testNowRun.status === TestRunStats.LOADING;
  const isTestNowCompleted = !testNowRun || testNowRun.status === TestRunStats.COMPLETED;

  if (isTestNowLoading) {
    return <EuiLoadingSpinner size="s" />;
  }

  return (
    <EuiToolTip content={testNowRun ? labels.TEST_SCHEDULED_LABEL : labels.TEST_NOW_LABEL}>
      <EuiButtonIcon
        iconType="play"
        onClick={() => testNowClick()}
        isDisabled={!isTestNowCompleted}
        aria-label={labels.TEST_NOW_ARIA_LABEL}
      />
    </EuiToolTip>
  );
};
