/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/actions/json_schema.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
// This is the json schema exported from browser-use, change page_id to tab_id
// TODO: don't know why zod can not generate the same schema, need to fix it
export const jsonNavigatorOutputSchema = {
  properties: {
    current_state: {
      description: 'Current state of the agent',
      properties: {
        page_summary: {
          title: 'Page Summary',
          type: 'string',
        },
        evaluation_previous_goal: {
          title: 'Evaluation Previous Goal',
          type: 'string',
        },
        memory: {
          title: 'Memory',
          type: 'string',
        },
        next_goal: {
          title: 'Next Goal',
          type: 'string',
        },
      },
      required: [
        'page_summary',
        'evaluation_previous_goal',
        'memory',
        'next_goal',
      ],
      title: 'AgentBrain',
      type: 'object',
    },
    action: {
      items: {
        properties: {
          done: {
            properties: {
              text: {
                title: 'Text',
                type: 'string',
              },
            },
            required: ['text'],
            title: 'DoneAction',
            type: 'object',
            nullable: true,
          },
          search_google: {
            properties: {
              query: {
                title: 'Query',
                type: 'string',
              },
            },
            required: ['query'],
            title: 'SearchGoogleAction',
            type: 'object',
            nullable: true,
          },
          go_to_url: {
            properties: {
              url: {
                title: 'Url',
                type: 'string',
              },
            },
            required: ['url'],
            title: 'GoToUrlAction',
            type: 'object',
            nullable: true,
          },
          go_back: {
            additionalProperties: true,
            description:
              'Accepts absolutely anything in the incoming data\nand discards it, so the final parsed model is empty.',
            properties: {},
            title: 'NoParamsAction',
            type: 'object',
            nullable: true,
          },
          click_element: {
            properties: {
              desc: {
                title: 'Intent',
                type: 'string',
                description:
                  'Very short explanation of the intent or purpose for calling this action',
              },
              index: {
                title: 'Index',
                type: 'integer',
              },
              xpath: {
                title: 'XPath',
                type: 'string',
                nullable: true,
              },
            },
            required: ['desc', 'index'],
            title: 'ClickElementAction',
            type: 'object',
            nullable: true,
          },
          input_text: {
            properties: {
              desc: {
                title: 'Intent',
                type: 'string',
                description:
                  'Very short explanation of the intent or purpose for calling this action',
              },
              index: {
                title: 'Index',
                type: 'integer',
              },
              text: {
                title: 'Text',
                type: 'string',
              },
              xpath: {
                title: 'XPath',
                type: 'string',
                nullable: true,
              },
            },
            required: ['desc', 'index', 'text'],
            title: 'InputTextAction',
            type: 'object',
            nullable: true,
          },
          switch_tab: {
            properties: {
              tab_id: {
                title: 'Page Id',
                type: 'integer',
              },
            },
            required: ['tab_id'],
            title: 'SwitchTabAction',
            type: 'object',
            nullable: true,
          },
          open_tab: {
            properties: {
              url: {
                title: 'Url',
                type: 'string',
              },
            },
            required: ['url'],
            title: 'OpenTabAction',
            type: 'object',
            nullable: true,
          },
          cache_content: {
            properties: {
              content: {
                title: 'Content',
                type: 'string',
              },
            },
            required: ['content'],
            title: 'cache_content_parameters',
            type: 'object',
            nullable: true,
          },
          scroll_down: {
            properties: {
              desc: {
                title: 'Intent',
                type: 'string',
                description:
                  'Very short explanation of the intent or purpose for calling this action',
              },
              amount: {
                title: 'Amount',
                type: 'integer',
                nullable: true,
              },
            },
            required: ['desc'],
            title: 'ScrollAction',
            type: 'object',
            nullable: true,
          },
          scroll_up: {
            properties: {
              desc: {
                title: 'Intent',
                type: 'string',
                description:
                  'Very short explanation of the intent or purpose for calling this action',
              },
              amount: {
                title: 'Amount',
                type: 'integer',
                nullable: true,
              },
            },
            required: ['desc'],
            title: 'ScrollAction',
            type: 'object',
            nullable: true,
          },
          send_keys: {
            properties: {
              desc: {
                title: 'Intent',
                type: 'string',
                description:
                  'Very short explanation of the intent or purpose for calling this action',
              },
              keys: {
                title: 'Keys',
                type: 'string',
              },
            },
            required: ['desc', 'keys'],
            title: 'SendKeysAction',
            type: 'object',
            nullable: true,
          },
          scroll_to_text: {
            properties: {
              desc: {
                title: 'Intent',
                type: 'string',
                description:
                  'Very short explanation of the intent or purpose for calling this action',
              },
              text: {
                title: 'Text',
                type: 'string',
              },
            },
            required: ['desc', 'text'],
            title: 'scroll_to_text_parameters',
            type: 'object',
            nullable: true,
          },
          get_dropdown_options: {
            properties: {
              index: {
                title: 'Index',
                type: 'integer',
              },
            },
            required: ['index'],
            title: 'get_dropdown_options_parameters',
            type: 'object',
            nullable: true,
          },
          select_dropdown_option: {
            properties: {
              index: {
                title: 'Index',
                type: 'integer',
              },
              text: {
                title: 'Text',
                type: 'string',
              },
            },
            required: ['index', 'text'],
            title: 'select_dropdown_option_parameters',
            type: 'object',
            nullable: true,
          },
        },
        title: 'ActionModel',
        type: 'object',
      },
      title: 'Action',
      type: 'array',
    },
  },
  required: ['current_state', 'action'],
  title: 'AgentOutput',
  type: 'object',
};
