/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  CloseOutlined,
  LogoutOutlined,
  MinusOutlined,
  WarningFilled,
  WarningOutlined,
} from '@ant-design/icons';

export function timeCostStrElement(timeCost?: number) {
  let str: string;
  if (typeof timeCost !== 'number') {
    str = '-';
  } else {
    str = `${(timeCost / 1000).toFixed(2)}s`;
  }
  return (
    <span
      style={{
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: 'tnum',
      }}
    >
      {str}
    </span>
  );
}

export const iconForStatus = (status: string): JSX.Element => {
  switch (status) {
    case 'finished':
    case 'passed':
    case 'success':
    case 'connected':
      return (
        <span style={{ color: '#2B8243' }}>
          <CheckOutlined />
        </span>
      );

    case 'finishedWithWarning':
      return (
        <span style={{ color: '#f7bb05' }}>
          <WarningOutlined />
        </span>
      );
    case 'failed':
    case 'timedOut':
    case 'interrupted':
      return (
        <span style={{ color: '#FF0A0A' }}>
          <CloseOutlined />
        </span>
      );
    case 'pending':
      return <ClockCircleOutlined />;
    case 'cancelled':
    case 'skipped':
      return <LogoutOutlined />;
    case 'running':
      return <ArrowRightOutlined />;
    default:
      return <MinusOutlined />;
  }
};
