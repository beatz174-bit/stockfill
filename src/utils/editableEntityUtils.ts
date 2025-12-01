import { AlertColor } from '@mui/material';

export interface ActionOutcome {
  text?: string;
  severity?: AlertColor;
  success?: boolean;
}

export interface FeedbackState {
  text: string;
  severity: AlertColor;
}

export const applyOutcome = (
  setFeedback: (feedback: FeedbackState) => void,
  outcome: ActionOutcome | void,
  defaultText: string,
  defaultSeverity: AlertColor = 'success',
) => {
  const success = outcome?.success ?? outcome?.severity !== 'error';
  const text = outcome?.text ?? defaultText;
  const severity = outcome?.severity ?? defaultSeverity;
  setFeedback({ text, severity });
  return success;
};
