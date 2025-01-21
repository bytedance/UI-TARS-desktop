/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
import { Button, Input, Modal, Tooltip } from 'antd';
import { useState } from 'react';

import { iconForStatus } from './misc';
import { useEnvConfig } from './store';

export function EnvConfig() {
  const { config, configString, loadConfig } = useEnvConfig();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempConfigString, setTempConfigString] = useState(configString);

  const showModal = (e: React.MouseEvent) => {
    setIsModalOpen(true);
    e.preventDefault();
  };

  const handleOk = () => {
    setIsModalOpen(false);
    loadConfig(tempConfigString);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const editBtn = (
    <Button type="link" size="small" onClick={showModal}>
      Edit
    </Button>
  );

  const [showEditButton, setShowEditButton] = useState(false);

  const configTip =
    Object.keys(config).length === 0 ? (
      <div>
        {iconForStatus('failed')} No config
        <p>
          <Tooltip
            title="Please set up your environment variables to use Midscene."
            placement="right"
            open={!isModalOpen}
          >
            <Button type="primary" onClick={showModal}>
              Click to set up
            </Button>
          </Tooltip>
        </p>
      </div>
    ) : (
      <div
        onMouseEnter={() => setShowEditButton(true)}
        onMouseLeave={() => setShowEditButton(false)}
      >
        {Object.entries(config).map(([key, value]) => (
          <div key={key} style={{ lineHeight: '1.8' }}>
            <span>
              {iconForStatus('success')} {key}:{' '}
              {key === 'MIDSCENE_MODEL_NAME' ? value : '***'}{' '}
              {showEditButton && editBtn}
            </span>
          </div>
        ))}
      </div>
    );

  return (
    <div>
      {configTip}
      <Modal
        title="Env Config"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Save"
        style={{ width: '800px' }}
      >
        <Input.TextArea
          rows={7}
          placeholder={
            'OPENAI_API_KEY=sk-...\nMIDSCENE_MODEL_NAME=gpt-4o-2024-08-06\n...'
          }
          value={tempConfigString}
          onChange={(e) => setTempConfigString(e.target.value)}
          style={{ whiteSpace: 'nowrap', wordWrap: 'break-word' }}
        />
        <div>
          <p>The format is KEY=VALUE and separated by new lines.</p>
          <p>
            These data will be saved <strong>locally in your browser</strong>.
          </p>
        </div>
      </Modal>
    </div>
  );
}
