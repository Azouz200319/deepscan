import { useStudentOverlay } from '../lib/StudentOverlayContext';
import VerificationOverlay from './VerificationOverlay';

export default function StudentOverlay() {
  const { isOpen, student, closeOverlay } = useStudentOverlay();

  if (!student) return null;

  return (
    <VerificationOverlay
      isOpen={isOpen}
      student={student as any}
      onClose={closeOverlay}
    />
  );
}

