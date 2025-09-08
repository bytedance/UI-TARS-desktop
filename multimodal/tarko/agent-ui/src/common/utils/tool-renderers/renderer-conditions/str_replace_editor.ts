import { FunctionToolToRendererCondition } from '../types';

export const strReplaceEditorRendererCondition: FunctionToolToRendererCondition = (
  toolName: string,
  content: any,
): string | null => {
  if (toolName === 'str_replace_editor') {
    /**
     *
     * Object case (always FAIL for now):
     *
     * {
     *    "panelContent": {
     *        "type": "command_result",
     *        "source": {
     *            "output": "File created successfully at: /home/gem/agent-tars-poster/package.json",
     *            "error": null,
     *            "path": "/home/gem/agent-tars-poster/package.json",
     *            "prev_exist": false,
     *            "old_content": null,
     *            "new_content": "..."
     *        },
     *        "title": "str_replace_editor",
     *        "timestamp": 1755607726980,
     *        "toolCallId": "call_1755607726967_iiy3e7x6v",
     *        "arguments": {
     *            "command": "create",
     *            "path": "/home/gem/agent-tars-poster/package.json",
     *            "file_text": "..."
     *        }
     *    }
     * }
     */
    if (typeof content === 'object') {
      /***
       * Edit File
       *
       * {
       *   "output": "The file /home/gem/agent-tars-poster/src/App.tsx has been edited. Here's the result of running `cat -n` on a snippet of /home/gem/agent-tars-poster/src/App.tsx:\n     1\timport React, { useState, useEffect } from 'react';\n     2\timport './App.css';\n     3\t\n     4\tconst App: React.FC = () => {\n     5\t  const [isHovering, setIsHovering] = useState(false);\n     6\t  \n     7\t  return (\n     8\t    <div className=\"app-container\">\n     9\t      <div className=\"poster\" \n    10\t           style={{ transform: isHovering ? 'rotate(0deg) scale(1.02)' : 'rotate(-1deg)' }}\n    11\t           onMouseEnter={() => setIsHovering(true)}\n    12\t           onMouseLeave={() => setIsHovering(false)}>\n    13\t        \n    14\t        <div className=\"poster-header\">\n    15\t          <h1 className=\"poster-title\">Agent TARS</h1>\n    16\t          <img \n    17\t            src=\"https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png\" \n    18\t            alt=\"Agent TARS Icon\" \n    19\t            className=\"poster-icon\"\n    20\t          />\n    21\t        </div>\n    22\t        \n    23\t        <div className=\"poster-slogan\">\n    24\t          开源多模态 AI Agent\n    25\t        </div>\n    26\t        \n    27\t        <a \n    28\t          href=\"https://agent-tars.com\" \n    29\t          target=\"_blank\" \n    30\t          rel=\"noopener noreferrer\"\n    31\t          className=\"poster-cta\"\n    32\t        >\n    33\t          了解更多\n    34\t        </a>\n    35\t      </div>\n    36\t    </div>\n    37\t  );\n    38\t};\n    39\t\n    40\texport default App;\nReview the changes and make sure they are as expected. Edit the file again if necessary.",
       *   "error": null,
       *   "path": "/home/gem/agent-tars-poster/src/App.tsx",
       *   "prev_exist": true,
       *   "old_content": "import React, { useState, useEffect } from 'react';\nimport './App.css';\n\nconst App: React.FC = () => {\n  return (\n    <div className=\"app-container\">\n      <h1>Agent TARS Poster</h1>\n    </div>\n  );\n};\n\nexport default App;",
       *   "new_content": "import React, { useState, useEffect } from 'react';\nimport './App.css';\n\nconst App: React.FC = () => {\n  const [isHovering, setIsHovering] = useState(false);\n  \n  return (\n    <div className=\"app-container\">\n      <div className=\"poster\" \n           style={{ transform: isHovering ? 'rotate(0deg) scale(1.02)' : 'rotate(-1deg)' }}\n           onMouseEnter={() => setIsHovering(true)}\n           onMouseLeave={() => setIsHovering(false)}>\n        \n        <div className=\"poster-header\">\n          <h1 className=\"poster-title\">Agent TARS</h1>\n          <img \n            src=\"https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png\" \n            alt=\"Agent TARS Icon\" \n            className=\"poster-icon\"\n          />\n        </div>\n        \n        <div className=\"poster-slogan\">\n          开源多模态 AI Agent\n        </div>\n        \n        <a \n          href=\"https://agent-tars.com\" \n          target=\"_blank\" \n          rel=\"noopener noreferrer\"\n          className=\"poster-cta\"\n        >\n          了解更多\n        </a>\n      </div>\n    </div>\n  );\n};\n\nexport default App;"
       * }
       */
      if (content.prev_exist && content.new_content && content.old_content) {
        return 'diff_result';
      }

      /**
       * Create File
       */
      return 'file_result';
    }

    if (typeof content === 'string') {
      return 'command_result';
    }
    return null;
  }
  return null;
};

/**
 * For Omni-TARS  "execute_bash" tool.
 */
// if (panelContent.title === 'str_replace_editor' && panelContent.arguments) {
//   const { command = '', file_text = '', path = '' } = panelContent.arguments;

//   const mergedCommand = [command, path, '\n', file_text].filter(Boolean).join(' ');
//   if (typeof panelContent.source === 'object') {
//     return {
//       command: mergedCommand,
//       stdout: panelContent.source.output,
//       stderr: panelContent.source.error,
//       exitCode: panelContent.source.error ? 1 : 0,
//     };
//   }

/**
 * String case (always FAIL for now):
 * {
 *   "panelContent": {
 *      "type": "command_result",
 *      "source": "Error: Error: HTTP 500: Internal Server Error  [str_replace_editor] error: Ran into [Errno 2] No such file or directory: '/home/gem/agent-tars-poster/src/main.tsx' while trying to write to /home/gem/agent-tars-poster/src/main.tsx",
 *      "title": "str_replace_editor",
 *      "timestamp": 1755607307073,
 *      "toolCallId": "call_1755607306040_p0kmnxprd",
 *      "error": "Error: HTTP 500: Internal Server Error  [str_replace_editor] error: Ran into [Errno 2] No such file or directory: '/home/gem/agent-tars-poster/src/main.tsx' while trying to write to /home/gem/agent-tars-poster/src/main.tsx",
 *      "arguments": {
 *          "command": "create",
 *          "path": "/home/gem/agent-tars-poster/src/main.tsx",
 *          "file_text": "import React from 'react';\\nimport ReactDOM from 'react-dom/client';\\nimport App from './App';\\nimport './index.css';\\n\\nReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(\\n  "
 *      }
 *   }
 * }
 */
// if (typeof panelContent.source === 'string') {
//   const isError = panelContent.source.includes('Error: ');
//   return {
//     command: mergedCommand,
//     stderr: isError ? panelContent.source : '',
//     stdout: isError ? '' : panelContent.source,
//   };
// }
// }
