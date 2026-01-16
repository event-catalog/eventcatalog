import ActionResultModal from './ActionResultModal';
import ActionToast from './ActionToast';

/**
 * Global Actions component that renders the modal and toast containers.
 * This component should be mounted once in the layout to support action result display.
 */
export default function ActionGlobals() {
  return (
    <>
      <ActionResultModal />
      <ActionToast />
    </>
  );
}
