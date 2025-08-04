import { Request, Response } from "express";
import { Task } from "../models/task";
let tasks: Task[] = [
  {
    id: 1,
    title: "Task 1",
    description: "Description 1",
    completed: false,
  },
  {
    id: 2,
    title: "Task 2",
    description: "Description 2",
    completed: false,
  },
];

const tasksFn = (req: Request, res: Response) => {
  res.json({ message: "Tasks fetched successfully", data: tasks });
};

export { tasksFn };
