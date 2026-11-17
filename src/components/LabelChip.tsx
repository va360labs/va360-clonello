import type { CSSProperties } from 'react';
import type { Label } from '../board/types';
import { LABEL_HEX } from './labelColors';
import './LabelChip.css';

export function LabelChip({ label }: { label: Label }) {
  return (
    <span className="label-chip" style={{ '--label': LABEL_HEX[label.color] } as CSSProperties}>
      <span className="label-chip__dot" aria-hidden="true" />
      {label.name}
    </span>
  );
}
