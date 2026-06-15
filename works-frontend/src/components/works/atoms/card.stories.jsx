import { Button } from '../button';
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from './card';

export default {
  title: 'Works/Atoms/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['elevated', 'outlined', 'flat'] },
    padding: { control: 'select', options: ['none', 'sm', 'md'] },
  },
};

export const Elevated = {
  name: 'Elevated (default)',
  render: () => (
    <Card className="w-72">
      <CardHeader>
        <div>
          <CardTitle>Card title</CardTitle>
          <CardDescription>Supporting description text</CardDescription>
        </div>
        <Button variant="ghost" size="sm">Edit</Button>
      </CardHeader>
      <CardBody>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Main content area. Use CardBody for the primary content of the card.
        </p>
      </CardBody>
      <CardFooter>
        <Button size="sm">Primary action</Button>
        <Button variant="secondary" size="sm">Cancel</Button>
      </CardFooter>
    </Card>
  ),
};

export const Outlined = {
  render: () => (
    <Card variant="outlined" className="w-72">
      <CardHeader>
        <CardTitle>Outlined card</CardTitle>
      </CardHeader>
      <CardBody>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Outlined variant uses a border instead of a shadow — suits structured sections.
        </p>
      </CardBody>
    </Card>
  ),
};

export const Flat = {
  render: () => (
    <Card variant="flat" className="w-72">
      <CardHeader>
        <CardTitle>Flat card</CardTitle>
      </CardHeader>
      <CardBody>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Flat variant — no shadow or border. Use inside other cards or panels.
        </p>
      </CardBody>
    </Card>
  ),
};

export const AllVariants = {
  name: 'All variants',
  render: () => (
    <div className="flex flex-col gap-4 p-6 bg-neutral-100 dark:bg-neutral-900">
      {['elevated', 'outlined', 'flat'].map((variant) => (
        <Card key={variant} variant={variant} className="w-80">
          <CardHeader>
            <CardTitle>{variant.charAt(0).toUpperCase() + variant.slice(1)}</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Card with variant=&quot;{variant}&quot;.
            </p>
          </CardBody>
        </Card>
      ))}
    </div>
  ),
};
