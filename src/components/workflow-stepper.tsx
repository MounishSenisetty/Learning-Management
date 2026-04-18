interface WorkflowStepperProps {
  activeStep: 1 | 2 | 3 | 4;
}

const steps = ["Pre-test", "Simulation", "Post-test", "Survey"];

export function WorkflowStepper({ activeStep }: WorkflowStepperProps) {
  return (
    <div className="workflow-stepper">
      {steps.map((label, index) => {
        const step = index + 1;
        const active = step === activeStep;
        const completed = step < activeStep;

        return (
          <div key={label} className="workflow-step">
            <div
              className={`workflow-badge ${
                completed ? "workflow-badge-complete" : active ? "workflow-badge-active" : "workflow-badge-idle"
              }`}
            >
              {step}
            </div>
            <p className={`workflow-label ${active ? "workflow-label-active" : ""}`}>{label}</p>
            {index < steps.length - 1 && <span className="workflow-line" aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}
