import { ActivityFeed } from './activity-feed';
import { AiAssistButton } from './ai-assist-button';
import { FormField } from './form-field';
import { Modal } from './modal';
import { PresenceBar } from './presence-bar';
import { SearchInput } from './search-input';
import { Input } from '@/components/works/atoms/input';

export default {
  title: 'Works/Molecules/Core',
  parameters: { a11y: { test: 'error' } },
};

export const Form = {
  render: () => (
    <div className="max-w-sm">
      <FormField id="summary" label="Summary" helpText="Keep it clear and specific." required>
        <Input id="summary" defaultValue="Confirm production readiness" />
      </FormField>
    </div>
  ),
};

export const Search = {
  render: () => (
    <div className="max-w-sm">
      <SearchInput defaultValue="release" aria-label="Search work items" />
    </div>
  ),
};

export const Presence = {
  render: () => (
    <PresenceBar
      viewers={[
        { userId: 'USR-1', name: 'Asha Rao' },
        { userId: 'USR-2', name: 'Dev Shah' },
      ]}
      lockGranted={false}
      lockedBy="Asha Rao"
    />
  ),
};

export const Activity = {
  render: () => <ActivityFeed loading />,
};

export const AiAssist = {
  render: () => <AiAssistButton onClick={() => {}} />,
};

export const Dialog = {
  render: () => (
    <Modal title="Review changes" onClose={() => {}}>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Confirm the selected changes before applying them.
      </p>
    </Modal>
  ),
};
