# Harvest Finance UI Component System

A comprehensive, reusable UI component library for building finance applications with an agricultural green and white theme.

## 🎨 Design System

### Theme Colors

The component system uses an agricultural green palette with semantic colors:

| Color Name | Hex | Usage |
|------------|-----|-------|
| `harvest-green-50` | `#f0fdf4` | Lightest green background |
| `harvest-green-100` | `#dcfce7` | Light green backgrounds |
| `harvest-green-200` | `#bbf7d0` | Borders, dividers |
| `harvest-green-300` | `#86efac` | Hover states |
| `harvest-green-400` | `#4ade80` | Accents |
| `harvest-green-500` | `#22c55e` | Main green |
| `harvest-green-600` | `#16a34a` | Primary buttons |
| `harvest-green-700` | `#15803d` | Active states |
| `harvest-green-800` | `#166534` | Dark green text |
| `harvest-green-900` | `#14532d` | Darkest green |

### Semantic Colors

| Color | Usage |
|-------|-------|
| `success` | Positive actions, completed states |
| `warning` | Caution, pending states |
| `error` | Destructive actions, errors |
| `info` | Informational messages |

---

## 📦 Components

### Button

A versatile button component with multiple variants and states.

```tsx
import { Button } from '@/components/ui';

// Basic usage
<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>

// With icons
<Button
  variant="primary"
  leftIcon={<SaveIcon />}
  rightIcon={<ArrowIcon />}
>
  Save & Continue
</Button>

// Loading state
<Button variant="primary" isLoading>
  Processing...
</Button>

// Disabled
<Button variant="primary" isDisabled>
  Cannot Click
</Button>
```

#### Button Variants

| Variant | Description |
|---------|-------------|
| `primary` | Main action button (green) |
| `secondary` | Secondary action (light green) |
| `outline` | Bordered button |
| `ghost` | Text-only button |
| `danger` | Destructive action (red) |
| `success` | Success action (emerald) |

#### Button Sizes

| Size | Height | Use Case |
|------|--------|----------|
| `xs` | 28px | Compact UI |
| `sm` | 32px | Small buttons |
| `md` | 40px | Default |
| `lg` | 48px | Large CTAs |
| `xl` | 56px | Hero buttons |

#### Button Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `ButtonVariant` | `'primary'` | Visual style |
| `size` | `ButtonSize` | `'md'` | Button size |
| `isLoading` | `boolean` | `false` | Show loading spinner |
| `isDisabled` | `boolean` | `false` | Disable button |
| `leftIcon` | `ReactNode` | - | Icon before text |
| `rightIcon` | `ReactNode` | - | Icon after text |
| `fullWidth` | `boolean` | `false` | Full width button |

---

### Card

A versatile card component for grouping content.

```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui';

// Basic card
<Card>
  <CardHeader title="Card Title" subtitle="Subtitle text" />
  <CardBody>Card content goes here</CardBody>
  <CardFooter>Footer actions</CardFooter>
</Card>

// Clickable card
<Card clickable onClick={handleClick}>
  Click me!
</Card>

// Hoverable card
<Card hoverable>
  Hover for effect
</Card>

// Elevated variant
<Card variant="elevated">
  Floating card
</Card>
```

#### Card Variants

| Variant | Description |
|---------|-------------|
| `default` | Bordered with shadow |
| `elevated` | Large shadow, lifts on hover |
| `outlined` | Double border |
| `flat` | Gray background |

#### Card Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `CardVariant` | `'default'` | Visual style |
| `padding` | `CardPadding` | `'md'` | Content padding |
| `hoverable` | `boolean` | `false` | Scale on hover |
| `clickable` | `boolean` | `false` | Clickable card |

---

### Input

Form input component with labels and validation.

```tsx
import { Input, Textarea } from '@/components/ui';

// Basic input
<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
/>

// With validation
<Input
  label="Password"
  type="password"
  error="Password is required"
/>

// With hint
<Input
  label="Username"
  hint="Must be 3-20 characters"
/>

// Textarea
<Textarea
  label="Message"
  placeholder="Enter message..."
  rows={4}
  maxLength={500}
  showCount
/>
```

#### Input Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `InputType` | `'text'` | Input type |
| `size` | `InputSize` | `'md'` | Input size |
| `label` | `string` | - | Field label |
| `error` | `string` | - | Error message |
| `hint` | `string` | - | Help text |
| `isRequired` | `boolean` | `false` | Required field |
| `isDisabled` | `boolean` | `false` | Disabled state |
| `leftIcon` | `ReactNode` | - | Leading icon |
| `rightIcon` | `ReactNode` | - | Trailing icon |

---

### Modal

Dialog overlay component with animations.

```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui';
import { useState } from 'react';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="md">
        <ModalHeader title="Confirm Action" />
        <ModalBody>
          <p>Are you sure?</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => setIsOpen(false)}>Confirm</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
```

#### Modal Sizes

| Size | Max Width |
|------|----------|
| `xs` | 384px |
| `sm` | 448px |
| `md` | 512px |
| `lg` | 672px |
| `xl` | 896px |
| `2xl` | 1152px |
| `full` | Viewport width |

#### Modal Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | **required** | Open state |
| `onClose` | `() => void` | **required** | Close handler |
| `size` | `ModalSize` | `'md'` | Modal size |
| `animation` | `ModalAnimation` | `'scale'` | Animation type |
| `closeOnOverlayClick` | `boolean` | `true` | Close on backdrop |
| `closeOnEsc` | `boolean` | `true` | Close on Escape |
| `isCentered` | `boolean` | `false` | Center vertically |

---

### Badge

Status indicator badges.

```tsx
import { Badge, StatusBadge } from '@/components/ui';

// Basic badges
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>

// With dot
<Badge variant="info" isDot>Processing</Badge>

// Pill style
<Badge variant="primary" isPill>New</Badge>

// Preset status badges
<StatusBadge.Active />
<StatusBadge.Pending />
<StatusBadge.Completed />
<StatusBadge.Failed />
```

#### Badge Variants

| Variant | Color | Use Case |
|---------|-------|----------|
| `default` | Gray | Neutral status |
| `primary` | Green | Primary items |
| `secondary` | Purple | Special items |
| `success` | Green | Active/Complete |
| `warning` | Amber | Pending/Warning |
| `error` | Red | Failed/Error |
| `info` | Blue | Informational |

#### Badge Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `BadgeVariant` | `'default'` | Badge style |
| `size` | `BadgeSize` | `'md'` | Badge size |
| `isDot` | `boolean` | `false` | Show dot indicator |
| `isPill` | `boolean` | `false` | Rounded pill style |

---

### Container

Responsive layout container.

```tsx
import { Container, Section, Stack, Inline } from '@/components/ui';

// Responsive container
<Container size="lg">
  <p>Content with max-width</p>
</Container>

// Full width
<Container isFluid>
  <p>Full width content</p>
</Container>

// Centered
<Container isCentered>
  <p>Centered content</p>
</Container>
```

#### Container Sizes

| Size | Max Width |
|------|----------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |
| `full` | 100% |

---

### Layout Components

Additional layout utilities.

```tsx
import { Section, Stack, Inline } from '@/components/ui';

// Section with background
<Section background="gradient" paddingY="lg">
  <p>Content</p>
</Section>

// Vertical stack
<Stack direction="col" gap="md">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</Stack>

// Horizontal stack
<Stack direction="row" gap="md" justify="between">
  <div>Left</div>
  <div>Right</div>
</Stack>

// Inline elements
<Inline gap="sm" align="center">
  <Badge>New</Badge>
  <span>Label</span>
</Inline>
```

#### Stack Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `direction` | `'row' \| 'col'` | `'col'` | Flex direction |
| `gap` | `'none' \| 'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Gap size |
| `align` | `'start' \| 'center' \| 'end' \| 'stretch'` | `'stretch'` | Align items |
| `justify` | `'start' \| 'center' \| 'end' \| 'between' \| 'around'` | `'start'` | Justify content |
| `wrap` | `boolean` | `false` | Wrap items |

---

## ♿ Accessibility

All components are built with accessibility in mind:

- **Keyboard Navigation**: Full keyboard support with visible focus states
- **ARIA Labels**: Proper ARIA attributes for screen readers
- **Focus Management**: Modal traps focus and restores on close
- **Color Contrast**: Meets WCAG AA contrast ratios
- **Screen Reader**: Content properly announced

### Focus States

All interactive elements have visible focus indicators:
```css
focus-visible:ring-2 focus-visible:ring-harvest-green-500 focus-visible:ring-offset-2
```

---

## 📱 Responsive Design

Components are responsive by default:

| Breakpoint | Min Width |
|------------|-----------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

---

## 🎬 Animations

Lightweight, performant animations:

| Animation | Duration | Use Case |
|-----------|----------|----------|
| `fade` | 200ms | Opacity transitions |
| `scale` | 200ms | Modal, dropdown |
| `slide` | 300ms | Reveal animations |

---

## 🛠️ Usage

### Quick Start

```tsx
import {
  Button,
  Card,
  Input,
  Modal,
  Badge,
  Container,
} from '@/components/ui';

export default function MyPage() {
  return (
    <Container size="lg">
      <Card>
        <h1>Welcome</h1>
        <Input label="Name" />
        <Button variant="primary">Submit</Button>
      </Card>
    </Container>
  );
}
```

---

## 📄 License

Built for Harvest Finance Platform.
