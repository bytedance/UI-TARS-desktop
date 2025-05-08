/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
/* eslint-disable max-lines */
'use client';

import { timeStr } from '@/utils';
import { RadiusSettingOutlined } from '@ant-design/icons';
import type {
  BaseElement,
  ExecutionTaskInsightAssertion,
  ExecutionTaskInsightLocate,
  ExecutionTaskPlanning,
} from '@midscene/core';
import { paramStr, typeStr } from '@midscene/web/ui-utils';
import { Tag, Timeline, type TimelineItemProps, Tooltip } from 'antd';

import { highlightColorForType } from './color';
import './detail-side.less';
import { timeCostStrElement } from './misc';
import PanelTitle from './panel-title';
import { useExecutionDump } from './store';

/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
/* eslint-disable max-lines */

/* eslint-disable max-lines */

/* eslint-disable max-lines */

const noop = () => {};
const Card = (props: {
  liteMode?: boolean;
  highlightWithColor?: string;
  title?: string;
  subtitle?: string;
  characteristic?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  content: any;
}) => {
  const {
    highlightWithColor,
    title,
    subtitle,
    onMouseEnter,
    onMouseLeave,
    content,
    characteristic,
  } = props;
  const titleTag = props.characteristic ? (
    <div className="item-extra">
      <div className="title-tag">
        <Tooltip
          placement="bottomRight"
          title={characteristic}
          mouseEnterDelay={0}
        >
          <span>
            <RadiusSettingOutlined />
          </span>
        </Tooltip>
      </div>
    </div>
  ) : null;

  const titleRightPaddingClass = props.characteristic
    ? 'title-right-padding'
    : '';
  const modeClass = props.liteMode ? 'item-lite' : '';
  const highlightStyle = highlightWithColor
    ? { backgroundColor: highlightWithColor }
    : {};
  return (
    <div
      className={`item ${modeClass} ${highlightWithColor ? 'item-highlight' : ''}`}
      style={{ ...highlightStyle }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* {extraSection} */}

      <div
        className={`title ${titleRightPaddingClass}`}
        style={{ display: title ? 'block' : 'none' }}
      >
        {title}
        {titleTag}
      </div>
      <div
        className={`subtitle ${titleRightPaddingClass}`}
        style={{ display: subtitle ? 'block' : 'none' }}
      >
        {subtitle}
      </div>
      <div
        className="description"
        style={{ display: content ? 'block' : 'none' }}
      >
        {content}
      </div>
    </div>
  );
};

const MetaKV = (props: {
  data: { key: string; content: string | JSX.Element }[];
}) => {
  return (
    <div className="meta-kv">
      {props.data.map((item, index) => {
        return (
          <div className="meta" key={index}>
            <div className="meta-key">{item.key}</div>
            <div className="meta-value">{item.content}</div>
          </div>
        );
      })}
    </div>
  );
};

const objectWithoutKeys = (obj: Record<string, unknown>, keys: string[]) =>
  Object.keys(obj).reduce((acc, key) => {
    if (!keys.includes(key)) {
      (acc as any)[key] = obj[key];
    }
    return acc;
  }, {});

const DetailSide = (): JSX.Element => {
  const task = useExecutionDump((store) => store.activeTask);
  const dump = useExecutionDump((store) => store.insightDump);
  const dump2 = useExecutionDump((store) => store.dump);
  const { matchedSection: sections, matchedElement: elements } = dump || {};

  // console.log('useExecutionDump dump2', dump2);

  const kv = (data: Record<string, unknown>) => {
    const isElementItem = (value: unknown): value is BaseElement =>
      Boolean(value) &&
      typeof value === 'object' &&
      typeof (value as any).content !== 'undefined' &&
      Boolean((value as any).center) &&
      Boolean((value as any).rect);

    const elementEl = (value: BaseElement) => (
      <span>
        <Tag bordered={false} color="orange" className="element-button">
          Element
        </Tag>
      </span>
    );

    if (Array.isArray(data) || typeof data !== 'object') {
      return (
        <pre className="description-content">
          {JSON.stringify(data, undefined, 2)}
        </pre>
      );
    }

    return Object.keys(data).map((key) => {
      const value = data[key];
      let content;
      if (typeof value === 'object' && isElementItem(value)) {
        content = elementEl(value);
      } else if (
        Array.isArray(value) &&
        value.some((item) => isElementItem(item))
      ) {
        content = value.map((item, index) => (
          <span key={index}>{elementEl(item)}</span>
        ));
      } else {
        content =
          typeof value === 'string'
            ? value
            : JSON.stringify(value, undefined, 2);
      }

      return (
        <pre className="description-content" key={key}>
          {key} {content}
        </pre>
      );
    });
  };

  const usageInfo = (task as ExecutionTaskInsightLocate)?.log?.dump?.taskInfo
    ?.usage
    ? JSON.stringify(
        (task as ExecutionTaskInsightLocate).log!.dump!.taskInfo!.usage,
        undefined,
        2,
      )
    : '';

  let modelKVElement: JSX.Element | null = null;
  if (dump2?.modelDetail && typeof dump2.modelDetail === 'object') {
    modelKVElement = MetaKV({
      data: Object.entries(dump2.modelDetail).map(([k, v]) => {
        return {
          key: k,
          content: v as string,
        };
      }),
    });
  }

  const metaKVElement = MetaKV({
    data: [
      {
        key: 'type',
        content: task?.type || '',
      },
      {
        key: 'start',
        content: timeStr(task?.timing?.start),
      },
      {
        key: 'end',
        content: timeStr(task?.timing?.end),
      },
      {
        key: 'cost',
        content: timeCostStrElement(task?.timing?.cost),
      },
      ...(task?.locate
        ? [
            {
              key: 'locate',
              content: JSON.stringify(task.locate),
            },
          ]
        : []),
      ...(usageInfo ? [{ key: 'usage', content: usageInfo }] : []),
    ],
  });

  let actionsKVElement: JSX.Element | null = null;
  if (Array.isArray(task?.actions)) {
    actionsKVElement = MetaKV({
      data:
        (task?.actions ?? []).map((item) => {
          return {
            key: item.type,
            content: item.input,
          };
        }) || [],
    });
  }

  const matchedElementsEl = elements?.length
    ? elements.map((element, idx) => {
        const ifHighlight = false; // highlightElements.includes(element);
        const highlightColor = ifHighlight
          ? highlightColorForType('element')
          : undefined;

        const elementKV = kv(
          objectWithoutKeys(element as any, [
            'content',
            'rect',
            'center',
            'left',
            'top',
            'right',
            'bottom',
            'locator',
          ]),
        );

        return (
          <Card
            title={element.content}
            highlightWithColor={highlightColor}
            subtitle=""
            content={elementKV}
            key={idx}
          />
        );
      })
    : null;

  // const [showQuery, setShowQuery] = useState(false);

  const errorSection = task?.error ? (
    <Card
      liteMode={true}
      title="Error"
      onMouseEnter={noop}
      onMouseLeave={noop}
      content={
        <pre className="description-content" style={{ color: '#F00' }}>
          {task.error}
        </pre>
      }
    />
  ) : null;

  const dataCard = dump?.data ? (
    <Card
      liteMode={true}
      onMouseEnter={noop}
      onMouseLeave={noop}
      content={<pre>{JSON.stringify(dump.data, undefined, 2)}</pre>}
    />
  ) : null;

  let assertionCard: JSX.Element | null = null;
  if (task?.type === 'Insight' && task.subType === 'Assert') {
    assertionCard = (
      <Card
        liteMode={true}
        title="Assert"
        onMouseEnter={noop}
        onMouseLeave={noop}
        content={
          <pre className="description-content">
            {JSON.stringify(
              (task as ExecutionTaskInsightAssertion).output,
              undefined,
              2,
            )}
          </pre>
        }
      />
    );
  }

  const plans = (task as ExecutionTaskPlanning)?.output?.actions;
  let timelineData: TimelineItemProps[] = [];
  if (plans) {
    timelineData = timelineData.concat(
      plans.map((item) => {
        const paramToShow = item.param || {};
        const paramStr = Object.keys(paramToShow).length
          ? JSON.stringify(paramToShow, undefined, 2)
          : null;

        const locateStr =
          item.type === 'Locate' && item.locate
            ? JSON.stringify(item.locate)
            : null;

        return {
          color: '#06B1AB',
          children: (
            <>
              <p>
                <b>{typeStr(item as any)}</b>
              </p>
              <p>{item.thought}</p>
              <p>{paramStr}</p>
              <p>{locateStr}</p>
            </>
          ),
        };
      }),
    );
    if ((task as ExecutionTaskPlanning).output?.furtherPlan) {
      timelineData.push({
        color: '#06B1AB',
        children: (
          <>
            <p>
              <b>Further Plan</b>
            </p>
            <p>
              {
                (task as ExecutionTaskPlanning).output?.furtherPlan
                  ?.whatToDoNext
              }
            </p>
          </>
        ),
      });
    }
  }

  return (
    <div className="detail-side">
      <PanelTitle title="Model Meta" />
      {modelKVElement}
      <PanelTitle title="Task Meta" />
      {metaKVElement}
      <PanelTitle title="Actions" />
      {actionsKVElement}
      <PanelTitle title="Text Output" />
      <div
        style={{ paddingLeft: '10px', paddingRight: '10px', paddingTop: '4px' }}
      >
        {task?.value}
      </div>
      <div className="item-list item-list-space-up">
        {errorSection}
        {dataCard}
        {assertionCard}
        {matchedElementsEl}
      </div>
    </div>
  );
};

export default DetailSide;
