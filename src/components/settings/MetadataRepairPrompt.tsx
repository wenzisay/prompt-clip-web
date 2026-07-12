import { useState } from 'react';
import { Button, Modal } from '@/components/common';
import { useTranslation } from '@/i18n';
import { useMetadataRepairStore } from '@/stores/metadataRepairStore';

interface MetadataRepairPromptProps {
  onRepair: () => Promise<void> | void;
  onViewDetails: () => void;
}

export function MetadataRepairPrompt({
  onRepair,
  onViewDetails,
}: MetadataRepairPromptProps) {
  const { t } = useTranslation();
  const { isOpen, result, ignoreCurrent, clear } = useMetadataRepairStore();
  const [isRepairing, setIsRepairing] = useState(false);

  const handleRepair = async () => {
    setIsRepairing(true);
    try {
      await onRepair();
      clear();
    } catch (error) {
      console.error('Failed to repair detected metadata:', error);
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen && Boolean(result)}
      onClose={ignoreCurrent}
      title={t.settings.metadataPromptTitle}
      closeLabel={t.app.close}
      maxWidth="md"
    >
      <p className="text-sm leading-6 text-muted">
        {t.settings.metadataPromptDescription(result?.repairableFiles ?? 0)}
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onClick={ignoreCurrent}>
          {t.settings.metadataPromptIgnore}
        </Button>
        <Button type="button" variant="secondary" onClick={onViewDetails}>
          {t.settings.metadataPromptView}
        </Button>
        <Button type="button" onClick={() => void handleRepair()} disabled={isRepairing}>
          {isRepairing
            ? t.settings.repairingMetadata
            : t.settings.metadataPromptRepair}
        </Button>
      </div>
    </Modal>
  );
}
