import type { Marker } from "../markers/marker.js";
import type { ClipRule } from "../clip-rules/clip-rule.js";
import type { Project } from "../projects/project.js";
import type { ClipTask } from "./clip-task.js";

export interface ClipRunner {
  run(input: {
    task: ClipTask;
    project: Project;
    rule: ClipRule;
    markers: Marker[];
  }): Promise<void>;
}
