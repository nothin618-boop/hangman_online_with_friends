'use client';

import React from 'react';
import { CloudStickman, CloudStickmanProps } from './CloudStickman';

export type JetpackStickmanProps = CloudStickmanProps;

export const JetpackStickman: React.FC<JetpackStickmanProps> = (props) => {
  return <CloudStickman {...props} />;
};
