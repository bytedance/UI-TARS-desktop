/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Box,
  Button,
  Center,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Select,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { Field, Form, Formik } from 'formik';
import { useLayoutEffect } from 'react';
import { useDispatch } from 'zutron';

import { VlmProvider } from '@main/store/types';

import { useStore } from '@renderer/hooks/useStore';
import { isWindows } from '@renderer/utils/os';

const Settings = () => {
  const { settings, thinking } = useStore();
  const toast = useToast();
  const dispatch = useDispatch(window.zutron);

  useLayoutEffect(() => {
    console.log('get_settings');
    dispatch({
      type: 'GET_SETTINGS',
      payload: null,
    });
  }, []);

  console.log('settings', settings, 'thinking', thinking);

  const handleSubmit = async (values) => {
    dispatch({
      type: 'SET_SETTINGS',
      payload: values,
    });

    toast({
      title: 'Settings saved successfully',
      position: 'top',
      status: 'success',
      duration: 1500,
      isClosable: true,
      variant: 'ui-tars-success',
      onCloseComplete: () => {
        dispatch({
          type: 'CLOSE_SETTINGS_WINDOW',
          payload: null,
        });
      },
    });
  };

  const handleCancel = () => {
    dispatch({
      type: 'CLOSE_SETTINGS_WINDOW',
      payload: null,
    });
  };

  console.log('initialValues', settings);

  return (
    <Box px={4} py={!isWindows ? 8 : 0} position="relative" overflow="hidden">
      {!isWindows && (
        <Box
          className="draggable-area"
          w="100%"
          h={34}
          position="absolute"
          top={0}
        />
      )}
      <Tabs variant="line">
        <TabList>
          <Tab>General</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <VStack spacing={8} align="stretch">
              {settings ? (
                <Formik initialValues={settings} onSubmit={handleSubmit}>
                  {({ values = {}, setFieldValue }) => (
                    <Form>
                      <VStack spacing={4} align="stretch">
                        <FormControl>
                          <FormLabel color="gray.700">Language</FormLabel>
                          <Field
                            as={Select}
                            name="language"
                            value={values.language}
                            bg="white"
                            borderColor="gray.200"
                            _hover={{ borderColor: 'gray.300' }}
                            _focus={{
                              borderColor: 'gray.400',
                              boxShadow: 'none',
                            }}
                          >
                            <option key="en" value="en">
                              English
                            </option>
                            <option key="zh" value="zh">
                              中文
                            </option>
                          </Field>
                        </FormControl>

                        <FormControl>
                          <FormLabel color="gray.700">VLM Provider</FormLabel>
                          <Field
                            as={Select}
                            name="vlmProvider"
                            value={values.vlmProvider}
                            bg="white"
                            borderColor="gray.200"
                            _hover={{ borderColor: 'gray.300' }}
                            _focus={{
                              borderColor: 'gray.400',
                              boxShadow: 'none',
                            }}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setFieldValue('vlmProvider', newValue);

                              if (!settings.vlmBaseUrl) {
                                setFieldValue('vlmProvider', newValue);
                                if (newValue === VlmProvider.vLLM) {
                                  setFieldValue(
                                    'vlmBaseUrl',
                                    'http://localhost:8000/v1',
                                  );
                                  setFieldValue('vlmModelName', 'ui-tars');
                                } else if (
                                  newValue === VlmProvider.Huggingface
                                ) {
                                  setFieldValue(
                                    'vlmBaseUrl',
                                    'https://<your_service>.us-east-1.aws.endpoints.huggingface.cloud/v1',
                                  );
                                  setFieldValue('vlmApiKey', 'your_api_key');
                                  setFieldValue(
                                    'vlmModelName',
                                    'your_model_name',
                                  );
                                }
                              }
                            }}
                          >
                            {Object.values(VlmProvider).map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </Field>
                        </FormControl>

                        <FormControl>
                          <FormLabel color="gray.700">VLM Base URL</FormLabel>
                          <Field
                            as={Input}
                            name="vlmBaseUrl"
                            value={values.vlmBaseUrl}
                            placeholder="please input VLM Base URL"
                          />
                        </FormControl>

                        <FormControl>
                          <FormLabel color="gray.700">VLM API Key</FormLabel>
                          <Field
                            as={Input}
                            name="vlmApiKey"
                            value={values.vlmApiKey}
                            placeholder="please input VLM API_Key"
                          />
                        </FormControl>

                        <FormControl>
                          <FormLabel color="gray.700">VLM Model Name</FormLabel>
                          <Field
                            as={Input}
                            name="vlmModelName"
                            value={values.vlmModelName}
                            placeholder="please input VLM Model Name"
                          />
                        </FormControl>

                        <HStack spacing={4}>
                          <Button
                            type="submit"
                            rounded="base"
                            variant="tars-ghost"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={handleCancel}
                            rounded="base"
                            variant="ghost"
                            fontWeight="normal"
                          >
                            Cancel
                          </Button>
                        </HStack>
                      </VStack>
                    </Form>
                  )}
                </Formik>
              ) : (
                <Center>
                  <Spinner color="color.primary" />
                </Center>
              )}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default Settings;

export { Settings as Component };
