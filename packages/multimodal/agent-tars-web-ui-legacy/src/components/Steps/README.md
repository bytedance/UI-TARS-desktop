# Steps Component API Documentation

## Component Overview

The `Steps` component is a React component designed to display task execution progress, offering smooth animation effects and interactive functionality. It's specifically designed to show multi-step operations, workflows, or task progress, supporting dynamic status updates of steps, automatic collapsing/expanding views, and automatic detection and animation effects for newly added steps.

## Basic Usage

```tsx
import { Steps } from '@agent-tars/web-ui';
import { useState } from 'react';

function TaskProgress() {
  // Step data
  const [steps, setSteps] = useState([
    {
      id: 1,
      title: 'Analyze Requirements',
      description: 'Understand user needs and determine solutions',
      status: 'completed',
    },
    {
      id: 2,
      title: 'Design Solution',
      description: 'Create detailed implementation plan',
      status: 'in-progress',
    },
    {
      id: 3,
      title: 'Execute Plan',
      description: 'Implement solution according to design plan',
      status: 'pending',
    },
  ]);

  // Handle step status updates
  const handleUpdateStatus = (id, status) => {
    setSteps(steps.map((step) => (step.id === id ? { ...step, status } : step)));
  };

  return <Steps steps={steps} onUpdateStatus={handleUpdateStatus} darkMode={false} />;
}
```

## Props

### Required Props

| Prop Name       | Type                                                                      | Description                                   |
| --------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| `steps`         | `Step[]`                                                                  | Array of step data defining all steps to show |
| `onUpdateStatus`| `(id: number, status: 'pending' \| 'in-progress' \| 'completed') => void` | Callback function triggered when step status changes |
| `darkMode`      | `boolean`                                                                 | Controls whether to use dark theme            |

### Step Object Structure

Each step object must include the following properties:

| Property      | Type                                        | Description           |
| ------------- | ------------------------------------------- | --------------------- |
| `id`          | `number`                                    | Unique identifier for the step |
| `title`       | `string`                                    | Step title            |
| `description` | `string`                                    | Detailed description of the step |
| `status`      | `'pending' \| 'in-progress' \| 'completed'` | Current status of the step |


## Usage Scenarios

### 1. Basic Flow Display

The simplest usage, showing a series of fixed steps and their statuses:

```tsx
import { Steps } from '@agent-tars/web-ui';

function BasicStepsExample() {
  const steps = [
    { id: 1, title: 'First Step', description: 'Start the process', status: 'completed' },
    { id: 2, title: 'Second Step', description: 'Processing', status: 'in-progress' },
    { id: 3, title: 'Third Step', description: 'Waiting to process', status: 'pending' },
  ];

  return (
    <Steps
      steps={steps}
      onUpdateStatus={(id, status) => console.log(`Step ${id} status changed to ${status}`)}
      darkMode={false}
    />
  );
}
```

### 2. Dynamic Step Status Updates

Responding to user interactions or external events by dynamically updating step statuses:

```tsx
import { Steps } from '@agent-tars/web-ui';
import { useState } from 'react';

function DynamicStepsExample() {
  const [steps, setSteps] = useState([
    { id: 1, title: 'Verify User', description: 'Verify user identity', status: 'pending' },
    { id: 2, title: 'Process Payment', description: 'Process user payment request', status: 'pending' },
    { id: 3, title: 'Send Confirmation', description: 'Send transaction confirmation message', status: 'pending' },
  ]);

  // Update step status
  const handleUpdateStatus = (id, status) => {
    setSteps(steps.map((step) => (step.id === id ? { ...step, status } : step)));
  };

  // Execute next step
  const processNextStep = () => {
    const pendingStepIndex = steps.findIndex((step) => step.status === 'pending');
    if (pendingStepIndex !== -1) {
      handleUpdateStatus(steps[pendingStepIndex].id, 'in-progress');

      // Simulate processing time
      setTimeout(() => {
        handleUpdateStatus(steps[pendingStepIndex].id, 'completed');
      }, 2000);
    }
  };

  return (
    <div>
      <Steps steps={steps} onUpdateStatus={handleUpdateStatus} darkMode={false} />
      <button onClick={processNextStep} disabled={!steps.some((step) => step.status === 'pending')}>
        Process Next Step
      </button>
    </div>
  );
}
```

### 3. Dynamically Adding New Steps

Dynamically adding new steps during the process to show more complex workflows:

```tsx
import { Steps } from '@agent-tars/web-ui';
import { useState } from 'react';

function GrowingStepsExample() {
  const [steps, setSteps] = useState([
    { id: 1, title: 'Analyze Data', description: 'Analyze user-provided data', status: 'completed' },
    { id: 2, title: 'Generate Report', description: 'Generate preliminary report based on analysis', status: 'in-progress' },
  ]);

  // Add new step
  const addStep = () => {
    const newStep = {
      id: Math.max(...steps.map((s) => s.id)) + 1,
      title: `Step ${steps.length + 1}`,
      description: `Dynamically added step ${steps.length + 1}`,
      status: 'pending',
    };

    setSteps([...steps, newStep]);
  };

  // Update step status
  const handleUpdateStatus = (id, status) => {
    setSteps(steps.map((step) => (step.id === id ? { ...step, status } : step)));
  };

  return (
    <div>
      <Steps steps={steps} onUpdateStatus={handleUpdateStatus} darkMode={false} />
      <button onClick={addStep}>Add New Step</button>
    </div>
  );
}
```

### 4. Integration with Chat Interface

Displaying progress of multi-step tasks in a chat interface:

```tsx
import { useState, useEffect } from 'react';
import { Steps } from '@agent-tars/web-ui';
import { ChatView } from '../components/Chat';

function ChatWithSteps() {
  const [chat, setChat] = useState({ messages: [] });
  const [steps, setSteps] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Send user message and handle multi-step task
  const handleSendMessage = async (content) => {
    setIsLoading(true);

    // Add user message
    const userMessage = { id: Date.now(), role: 'user', content, timestamp: Date.now() };
    setChat((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
    }));

    // Detect if it's a multi-step task (example condition)
    if (content.toLowerCase().includes('task') || content.toLowerCase().includes('steps')) {
      // Create initial steps
      const initialSteps = [
        {
          id: 1,
          title: 'Analyze User Request',
          description: `Parse: "${content.slice(0, 30)}${content.length > 30 ? '...' : ''}"`,
          status: 'pending',
        },
        {
          id: 2,
          title: 'Collect Information',
          description: 'Retrieve relevant data and best practices',
          status: 'pending',
        },
        {
          id: 3,
          title: 'Generate Response',
          description: 'Create response based on information',
          status: 'pending',
        },
      ];

      setSteps(initialSteps);

      // Simulate step progress
      simulateStepProgress(initialSteps, (updatedSteps) => {
        setSteps(updatedSteps);
      });

      // Add assistant reply (with steps)
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'I will execute this multi-step task for you',
        type: 'steps',
        steps: initialSteps,
        timestamp: Date.now(),
      };

      setChat((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));
    } else {
      // Regular reply
      setTimeout(() => {
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: `Received your message: "${content}"`,
          timestamp: Date.now(),
        };

        setChat((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
        }));

        setIsLoading(false);
      }, 1000);
    }
  };

  // Helper function to simulate step progress
  const simulateStepProgress = (steps, callback) => {
    let currentSteps = [...steps];
    let currentIndex = 0;

    const processStep = () => {
      if (currentIndex >= currentSteps.length) {
        setIsLoading(false);
        return;
      }

      // Update current step to in-progress
      currentSteps[currentIndex].status = 'in-progress';
      callback([...currentSteps]);

      // After delay, complete current step
      setTimeout(() => {
        currentSteps[currentIndex].status = 'completed';
        currentIndex++;
        callback([...currentSteps]);

        if (currentIndex < currentSteps.length) {
          setTimeout(processStep, 1000);
        } else {
          setIsLoading(false);

          // Update final message content
          setChat((prev) => {
            const updatedMessages = [...prev.messages];
            const lastMsgIndex = updatedMessages.length - 1;
            if (lastMsgIndex >= 0 && updatedMessages[lastMsgIndex].role === 'assistant') {
              updatedMessages[lastMsgIndex] = {
                ...updatedMessages[lastMsgIndex],
                content: 'All steps completed, task results are as follows: ...',
                steps: currentSteps,
              };
            }
            return { ...prev, messages: updatedMessages };
          });
        }
      }, 1500);
    };

    setTimeout(processStep, 1000);
  };

  // Render step messages
  const renderMessage = ({ message }) => {
    if (message.type === 'steps' && message.steps) {
      return (
        <div className="message assistant">
          <div className="content">
            <p>{message.content}</p>
            <div className="steps-container" style={{ marginTop: '1rem' }}>
              <Steps
                steps={message.steps}
                onUpdateStatus={() => {}} // Steps are controlled by the system in this scenario
                darkMode={false}
              />
            </div>
          </div>
          <div className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</div>
        </div>
      );
    }

    // Default return null, let ChatView use its default renderer
    return null;
  };

  return (
    <ChatView
      chat={chat}
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
      renderMessage={renderMessage}
    />
  );
}
```

### 5. Dark Mode

Using the component in dark mode:

```tsx
import { Steps } from '@agent-tars/web-ui';
import { useState } from 'react';

function DarkModeStepsExample() {
  const [darkMode, setDarkMode] = useState(false);
  const [steps, setSteps] = useState([
    { id: 1, title: 'First Step', description: 'Descriptive text', status: 'completed' },
    { id: 2, title: 'Second Step', description: 'Descriptive text', status: 'in-progress' },
    { id: 3, title: 'Third Step', description: 'Descriptive text', status: 'pending' },
  ]);

  return (
    <div className={darkMode ? 'dark-theme' : 'light-theme'}>
      <div className="theme-toggle">
        <label>
          <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
          Dark Mode
        </label>
      </div>

      <Steps
        steps={steps}
        onUpdateStatus={(id, status) => {
          setSteps(steps.map((step) => (step.id === id ? { ...step, status } : step)));
        }}
        darkMode={darkMode}
      />
    </div>
  );
}
```

## Styling and Customization

The Steps component uses Tailwind CSS for styling and Framer Motion for animations. The component has carefully adjusted styles for both light and dark modes.

### Color Theme

The component automatically applies different color themes based on the `darkMode` prop:

- **Light Mode** (`darkMode={false}`): Uses light background and dark text
- **Dark Mode** (`darkMode={true}`): Uses dark background and light text

### Status Colors

Each step has different visual effects based on its status:

- **Completed**: Uses black icon in light mode, white icon in dark mode
- **In Progress**: Shows rotating loading icon
- **Pending**: Uses muted color icon

### Custom Styling

You can adjust the component's appearance by applying custom CSS classes to the Steps component's parent container:

```tsx
<div className="custom-steps-container">
  <Steps steps={steps} onUpdateStatus={handleUpdateStatus} darkMode={isDarkMode} />
</div>
```

```css
.custom-steps-container {
  /* Custom border */
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;

  /* Custom shadow */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  /* Custom background */
  background-color: #fafafa;
}
```

## Accessibility

The Steps component follows accessibility best practices:

- Uses semantic HTML structure
- Provides sufficient color contrast
- Has visual feedback for step status changes
- Can be navigated using keyboard interactions

## Performance Considerations

The Steps component uses React.memo for optimization to reduce unnecessary re-renders. It maintains good performance even with a large number of steps.

## Notes and Best Practices

1. **Step ID Uniqueness**: Ensure each step's `id` is unique within the array, which is crucial for status updates and animation effects.

2. **New Step Addition Order**: When dynamically adding new steps, it's recommended to add them to the end of the array for the best animation effects. If you need to insert steps in the middle, the component will handle it correctly, but the animation effect may not be as ideal as expected.

3. **Step Description Length**: There's no strict limit on the length of step description text, but keeping it concise is recommended for the best visual effect.

4. **Status Cycling**: Clicking on a step icon cycles through statuses: pending → in-progress → completed → pending, which is useful for testing and demonstrations.

5. **Status Update Handling**: In the `onUpdateStatus` callback, ensure you correctly update the status and pass it to the component to avoid step status synchronization issues.

## Compatibility

- **Browser Compatibility**: Supports all major modern browsers.
- **React Version**: Compatible with React 16.8+ (requires Hooks support).
- **Dependencies**: Requires `framer-motion` and `react-icons/fi` libraries.

## Troubleshooting

**Issue**: Step status updates have no visual feedback

**Solution**: Confirm that the `onUpdateStatus` callback function correctly updates the step's status in the array and passes the updated array to the component.

**Issue**: Newly added steps don't show special animation

**Solution**: Ensure that when adding new steps, you use a brand new ID value. The component detects newly added steps by checking changes in the number of steps.

**Issue**: Connection lines between steps display abnormally

**Solution**: Check if the step array has the correct order and ensure that the `isLast` property is correctly set for the last step. In the current implementation, the component automatically handles this property.

## Version History

- **v1.0.0**: Initial version
- **v1.0.1**: Added automatic detection of newly added steps
- **v1.1.0**: Internal state management optimization, no longer requires external `expanded` and `onToggleExpand` props
