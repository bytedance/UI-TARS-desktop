/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/actions/json_gemini.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
// TODO: don't know why zod can not generate the same schema, need to fix it
export const geminiNavigatorOutputSchema = {
  type: 'object',
  properties: {
    current_state: {
      type: 'object',
      description: 'Current state of the agent',
      properties: {
        page_summary: {
          type: 'string',
        },
        evaluation_previous_goal: {
          type: 'string',
        },
        memory: {
          type: 'string',
        },
        next_goal: {
          type: 'string',
        },
      },
      required: [
        'page_summary',
        'evaluation_previous_goal',
        'memory',
        'next_goal',
      ],
    },
    action: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          done: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
              },
            },
            required: ['text'],
            nullable: true,
          },
          search_google: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
              },
            },
            required: ['query'],
            nullable: true,
          },
          go_to_url: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
              },
            },
            required: ['url'],
            nullable: true,
          },
          go_back: {
            type: 'string',
            nullable: true,
            description:
              'Accepts absolutely anything in the incoming data\nand discards it, so the final parsed model is empty.',
          },
          click_element: {
            type: 'object',
            properties: {
              desc: {
                type: 'string',
                description:
                  'Very short explanation of the intent or purpose for calling this action',
              },
              index: {
                type: 'integer',
              },
              xpath: {
                type: 'string',
                nullable: true,
              },
            },
            required: ['desc', 'index'],
            nullable: true,
          },
          input_text: {
            type: 'object',
            properties: {
              desc: {
                type: 'string',
                description:
                  'Very short explanation of the intent or purpose for calling this action',
              },
              index: {
                type: 'integer',
              },
              text: {
                type: 'string',
              },
              xpath: {
                type: 'string',
                nullable: true,
              },
            },
            required: ['desc', 'index', 'text'],
            nullable: true,
          },
          switch_tab: {
            type: 'object',
            properties: {
              tab_id: {
                type: 'integer',
              },
            },
            required: ['tab_id'],
            nullable: true,
          },
          open_tab: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
              },
            },
            required: ['url'],
            nullable: true,
          },
          cache_content: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
              },
            },
            required: ['content'],
            nullable: true,
          },
          scroll_down: {
            type: 'object',
            properties: {
              desc: {
                type: 'string',
                description:
                  'Very short explanation of the intent or purpose for calling this action',
              },
              amount: {
                type: 'integer',
                nullable: true,
              },
            },
            required: ['desc'],
            nullable: true,
          },
          scroll_up: {
            type: 'object',
            properties: {
              desc: {
                type: 'string',
                description:
                  'Very short explanation of the intent or purpose for calling this action',
              },
              amount: {
                type: 'integer',
                nullable: true,
              },
            },
            required: ['desc'],
            nullable: true,
          },
          send_keys: {
            type: 'object',
            properties: {
              desc: {
                type: 'string',
                description:
                  'Very short explanation of the intent or purpose for calling this action',
              },
              keys: {
                type: 'string',
              },
            },
            required: ['desc', 'keys'],
            nullable: true,
          },
          scroll_to_text: {
            type: 'object',
            properties: {
              desc: {
                type: 'string',
                description:
                  'Very short explanation of the intent or purpose for calling this action',
              },
              text: {
                type: 'string',
              },
            },
            required: ['desc', 'text'],
            nullable: true,
          },
          get_dropdown_options: {
            type: 'object',
            properties: {
              index: {
                type: 'integer',
              },
            },
            required: ['index'],
            nullable: true,
          },
          select_dropdown_option: {
            type: 'object',
            properties: {
              index: {
                type: 'integer',
              },
              text: {
                type: 'string',
              },
            },
            required: ['index', 'text'],
            nullable: true,
          },
        },
        required: [],
      },
    },
  },
  required: ['current_state', 'action'],
};
