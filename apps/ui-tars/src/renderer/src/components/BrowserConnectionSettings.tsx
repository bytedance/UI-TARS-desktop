import React from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Stack,
  Input,
  FormHelperText,
} from '@chakra-ui/react';
import { BrowserConnectionMode } from '@main/store/types';

interface BrowserConnectionSettingsProps {
  connectionMode: BrowserConnectionMode;
  wsEndpoint: string;
  setConnectionMode: (mode: BrowserConnectionMode) => void;
  setWsEndpoint: (endpoint: string) => void;
}

export const BrowserConnectionSettings: React.FC<
  BrowserConnectionSettingsProps
> = ({ connectionMode, wsEndpoint, setConnectionMode, setWsEndpoint }) => {
  return (
    <Box mb={6}>
      <FormControl>
        <FormLabel fontWeight="bold">Browser Connection Mode</FormLabel>
        <RadioGroup
          value={connectionMode}
          onChange={(value) =>
            setConnectionMode(value as BrowserConnectionMode)
          }
        >
          <Stack direction="column" spacing={2}>
            <Radio value={BrowserConnectionMode.LOCAL}>
              Local Browser (automatically launch browser)
            </Radio>
            <Radio value={BrowserConnectionMode.REMOTE}>
              Remote Browser (connect to existing browser via WebSocket)
            </Radio>
          </Stack>
        </RadioGroup>

        {connectionMode === BrowserConnectionMode.REMOTE && (
          <Box mt={4}>
            <FormLabel>WebSocket Endpoint</FormLabel>
            <Input
              placeholder="ws://localhost:9222/devtools/browser/[id]"
              value={wsEndpoint}
              onChange={(e) => setWsEndpoint(e.target.value)}
            />
            <FormHelperText>
              Specify the WebSocket endpoint URL of a running browser instance.
              <br />
              Example: Start Chrome with{' '}
              <code>--remote-debugging-port=9222</code> and use the URL from
              DevTools.
            </FormHelperText>
          </Box>
        )}
      </FormControl>
    </Box>
  );
};
