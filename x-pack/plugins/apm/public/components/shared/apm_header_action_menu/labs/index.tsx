/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { LabsFlyout } from './labs_flyout';

export function Labs() {
  const [isOpen, setIsOpen] = useState(false);

  function toggleFlyoutVisibility() {
    setIsOpen((state) => !state);
  }

  return (
    <>
      <EuiButtonEmpty color="text" onClick={toggleFlyoutVisibility}>
        {i18n.translate('xpack.apm.labs', { defaultMessage: 'Labs' })}
      </EuiButtonEmpty>
      {isOpen && <LabsFlyout onClose={toggleFlyoutVisibility} />}
    </>
  );
}
