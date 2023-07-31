# mbuzi
Job scheduler

## Scheduling a job
```typescript
import mbuzi, { TaskArgs } from "mbuzi";
mbuzi.config();

const action = async (arg: TaskArgs) => {
  //console.log("working: ", arg.name);
  return { value: true };
};
const handleFailed = async (arg: TaskArgs) => {
  //console.log("failed: ", arg);
  return;
};
const handleSuccess1 = async (arg: TaskArgs) => {
  console.log("success1: ", arg.name, arg.result.value == true);
  return;
};
const handleSuccess2 = async (arg: TaskArgs) => {
  console.log("success2: ", arg.name, arg.result.value == true);
  return;
};
const handleDone = async (arg: TaskArgs) => {
  console.log("done: ", arg.name, arg.result.value == true);
  return;
};
mbuzi
  .task("check", action)
  .onFail(handleFailed)
  .onSuccess(handleSuccess1)
  .onSuccess(handleSuccess2)
  .onDone(handleDone)
  .each("seconds", 5)
  .commit();


```

### Mbuzi api
- mbuzi.config()
  - initialize mbuzi
- mbuzi.task(name, action)
  - name: task name
  - async action: callback async function
  - `Return` MbuziOptions
- mbuzi.taskSync(name, action)
  - name: task name
  - action: callback function
  - `Return` MbuziOptions
### MbuziOptions
- onFail(callback)
  - called when action failed with error
- onSuccess(callback)
  - called when action was completed without error
- onDone(callback)
  - called after onSuccess/onFail for cleanup
- each('seconds', 60)
  - on every 60 seconds, run this task
- commit
  - append task to queue
