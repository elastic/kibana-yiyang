/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import {
  RISKY_HOSTS_DOC_LINK,
  RISKY_HOSTS_EXTERNAL_DOC_LINK,
  RISKY_USERS_DOC_LINK,
  RISKY_USERS_EXTERNAL_DOC_LINK,
} from '../../../../../common/constants';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { LEARN_MORE } from '../../../../overview/components/entity_analytics/host_risk_score/translations';

const RiskScoreDocLinkComponent = ({
  external,
  riskScoreEntity,
  title,
}: {
  external: boolean;
  riskScoreEntity: RiskScoreEntity;
  title?: string | React.ReactNode;
}) => {
  const externalLink =
    riskScoreEntity === RiskScoreEntity.user
      ? RISKY_USERS_EXTERNAL_DOC_LINK
      : RISKY_HOSTS_EXTERNAL_DOC_LINK;

  const docLink =
    riskScoreEntity === RiskScoreEntity.user ? RISKY_USERS_DOC_LINK : RISKY_HOSTS_DOC_LINK;

  const link = external ? externalLink : docLink;
  return (
    <EuiLink target="_blank" rel="noopener nofollow noreferrer" href={link} external={external}>
      {title ? title : LEARN_MORE}
    </EuiLink>
  );
};

export const RiskScoreDocLink = React.memo(RiskScoreDocLinkComponent);

RiskScoreDocLink.displayName = 'RiskScoreDocLink';
