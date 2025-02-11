/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Redirect } from 'react-router-dom';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import type { SecuritySolutionPluginContext } from '@kbn/threat-intelligence-plugin/public';
import { THREAT_INTELLIGENCE_BASE_PATH } from '@kbn/threat-intelligence-plugin/public';
import type { SourcererDataView } from '@kbn/threat-intelligence-plugin/public/types';
import type { Store } from 'redux';
import { useInvestigateInTimeline } from './use_investigate_in_timeline';
import { getStore } from '../common/store';
import { useKibana } from '../common/lib/kibana';
import { FiltersGlobal } from '../common/components/filters_global';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { useIsExperimentalFeatureEnabled } from '../common/hooks/use_experimental_features';
import { licenseService } from '../common/hooks/use_license';
import { SecurityPageName } from '../app/types';
import type { SecuritySubPluginRoutes } from '../app/types';
import { useSourcererDataView } from '../common/containers/sourcerer';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';

const ThreatIntelligence = memo(() => {
  const { threatIntelligence } = useKibana().services;
  const ThreatIntelligencePlugin = threatIntelligence.getComponent();

  const sourcererDataView = useSourcererDataView();

  const enabled = useIsExperimentalFeatureEnabled('threatIntelligenceEnabled');
  if (!enabled) {
    return <Redirect to="/" />;
  }

  const securitySolutionStore = getStore() as Store;

  const securitySolutionContext: SecuritySolutionPluginContext = {
    getFiltersGlobalComponent: () => FiltersGlobal,
    getPageWrapper: () => SecuritySolutionPageWrapper,
    licenseService,
    sourcererDataView: sourcererDataView as unknown as SourcererDataView,
    getSecuritySolutionStore: securitySolutionStore,
    getUseInvestigateInTimeline: useInvestigateInTimeline,
  };

  return (
    <TrackApplicationView viewId="threat_intelligence">
      <ThreatIntelligencePlugin securitySolutionContext={securitySolutionContext} />
      <SpyRoute pageName={SecurityPageName.threatIntelligenceIndicators} />
    </TrackApplicationView>
  );
});

ThreatIntelligence.displayName = 'ThreatIntelligence';

export const routes: SecuritySubPluginRoutes = [
  {
    path: THREAT_INTELLIGENCE_BASE_PATH,
    render: () => <ThreatIntelligence />,
  },
];
