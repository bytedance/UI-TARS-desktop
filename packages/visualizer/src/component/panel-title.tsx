/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
import './panel-title.less';

const PanelTitle = (props: {
  title: string;
  subTitle?: string;
}): JSX.Element => {
  const subTitleEl = props.subTitle ? (
    <div className="task-list-sub-name">{props.subTitle}</div>
  ) : null;
  return (
    <div className="panel-title">
      <div className="task-list-name">{props.title}</div>
      {subTitleEl}
    </div>
  );
};

export default PanelTitle;
