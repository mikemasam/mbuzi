type Context = {
  tasks: Task[];
  interval: number | null;
  debugging: boolean;
};
type Task = {
  name: string;
  id: string;
  space: number;
  waitTime: number;
  action: (arg: TaskArgs) => Promise<void>;
  onFail: ((arg: TaskArgs) => any | undefined)[];
  onSuccess: ((arg: TaskArgs) => any | undefined)[];
  onDone: ((arg: TaskArgs) => any | undefined)[];
  window: number;
  status: "on" | "off" | "busy" | "failed";
};
export type TaskArgs = {
  name: string;
  id: string;
  result: any | undefined;
  status: "success" | "failed" | "pending";
};

export type MbuziOptions = {
  onFail: (arg: (arg: TaskArgs) => any) => MbuziOptions;
  onDone: (arg: (arg: TaskArgs) => any) => MbuziOptions;
  onSuccess: (arg: (arg: TaskArgs) => any) => MbuziOptions;
  each: (
    format: "seconds" | "minutes" | "hours",
    value: number
  ) => MbuziOptions;
  commit: () => void;
};
export type ActionSync = (arg: TaskArgs) => void;
export type ActionAsync = (arg: TaskArgs) => Promise<void>;

type Mbuzi = {
  taskSync: (name: string, action: (arg: TaskArgs) => void) => MbuziOptions;
  task: (
    name: string,
    action: (arg: TaskArgs) => Promise<void>
  ) => MbuziOptions;
  queue: {
    count: () => void;
  };
  config: () => void;
};

const context: Context = {
  debugging: false,
  tasks: [],
  interval: null,
};

async function exec(id: string) {
  const task = context.tasks.find((t) => t.id == id);
  if (!task) return;
  const arg: TaskArgs = {
    name: task.name,
    id: task.id,
    result: undefined,
    status: "pending",
  };
  const result: { ok: boolean; result: any } = await Promise.resolve(
    task.action(arg)
  )
    .then((res) => ({ ok: true, result: res }))
    .catch((err) => ({ ok: false, result: err }));
  arg.result = result.result;
  if (result.ok) {
    arg.status = "success";
    await Promise.all(task.onSuccess.map((action) => action(arg)));
  } else {
    arg.status = "failed";
    await Promise.all(task.onFail.map((action) => action(arg)));
  }
  await Promise.all(task.onDone.map((action) => action(arg)));
  task.space = task.window;
  task.status = "on";
}
function workfind() {
  for (let i = 0; i < context.tasks.length; i++) {
    const task = context.tasks[i];
    if (task.waitTime == 0 && task.status == "busy")
      console.log(`Task '${task.name}' takes too long to complete.`);
    if (task.status == "busy") task.waitTime--;
    if (task.status != "on") continue;
    task.space -= 1;
    if (task.space <= 0) {
      task.status = "busy";
      task.waitTime = task.window;
      void (async () => exec(task.id))();
    }
    if (context.debugging) console.log(`work ${task.name}: ${task.space}`);
  }
}
function config(debug: boolean = false) {
  context.debugging = debug;
  if (context.interval) return;
  if (context.debugging) console.log("Mbuzi Scheduler started");
  context.interval = setInterval(workfind, 1000);
  return null;
}

function createOpts(task_id: string): MbuziOptions {
  const opts: MbuziOptions = {
    onFail: (arg: (arg: TaskArgs) => any) => {
      const task = context.tasks.find((t) => t.id == task_id);
      if (task) task.onFail.push(arg);
      return opts;
    },
    onSuccess: (arg: (arg: TaskArgs) => any) => {
      const task = context.tasks.find((t) => t.id == task_id);
      if (task) task.onSuccess.push(arg);
      return opts;
    },
    onDone: (arg: (arg: TaskArgs) => any) => {
      const task = context.tasks.find((t) => t.id == task_id);
      if (task) task.onDone.push(arg);
      return opts;
    },
    each: (format: "seconds" | "minutes" | "hours", time: number) => {
      let window = 0;
      switch (format) {
        case "seconds":
          window = time;
          break;
        case "minutes":
          window = time * 60;
          break;
        case "hours":
          window = time * 60 * 60;
          break;
      }
      const task = context.tasks.find((t) => t.id == task_id);
      if (task) {
        task.window = window;
      }
      return opts;
    },
    commit: () => {
      const task = context.tasks.find((t) => t.id == task_id);
      if (task) {
        if (task.window <= 0) task.window = 1;
        task.space = task.window;
        task.status = "on";
      }
    },
  };
  return opts;
}

function createTask(name: string, action: ActionAsync): MbuziOptions {
  const dup = context.tasks.find((t) => t.name == name);
  if (dup) throw new Error(`Task '${name}' already exists`);
  const task: Task = {
    name: name,
    action: action,
    waitTime: -1,
    window: 0,
    status: "off",
    onSuccess: [],
    onFail: [],
    onDone: [],
    id: Math.random().toString(),
    space: 0,
  };
  context.tasks.push(task);
  return createOpts(task.id);
}

function taskSync(name: string, action: ActionSync) {
  return createTask(name, async (arg: TaskArgs) => action(arg));
  //return opts;
}
function taskAsync(name: string, action: ActionAsync) {
  return createTask(name, action);
}

function count() {
  return null;
}
const mbuzi: Mbuzi = {
  task: taskAsync,
  taskSync: taskSync,
  config: config,
  queue: { count },
};

export default mbuzi;
