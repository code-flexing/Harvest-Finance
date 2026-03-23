'use client';

import React, { useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Input,
  Textarea,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Badge,
  StatusBadge,
  Container,
  Section,
  Stack,
  Inline,
} from '@/components/ui';

/**
 * Components Demo Page
 * 
 * This page demonstrates all the UI components in the Harvest Finance component system.
 * Each component showcases different variants, states, and configurations.
 */
export default function ComponentsDemoPage() {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLargeModalOpen, setIsLargeModalOpen] = useState(false);

  // Form state for inputs
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    message: '',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <Section background="gradient" paddingY="xl">
        <Container>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Harvest Finance UI Components
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A comprehensive, reusable component library for building
              finance applications with an agricultural green and white theme.
            </p>
          </div>
        </Container>
      </Section>

      {/* Button Section */}
      <Section paddingY="lg">
        <Container>
          <Card>
            <CardHeader title="Button Component" subtitle="Versatile button with multiple variants and states" />
            <CardBody>
              <div className="space-y-8">
                {/* Button Variants */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Variants</h4>
                  <Stack direction="row" gap="md" wrap>
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="danger">Danger</Button>
                    <Button variant="success">Success</Button>
                  </Stack>
                </div>

                {/* Button Sizes */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Sizes</h4>
                  <Stack direction="row" gap="md" align="center" wrap>
                    <Button size="xs">Extra Small</Button>
                    <Button size="sm">Small</Button>
                    <Button size="md">Medium</Button>
                    <Button size="lg">Large</Button>
                    <Button size="xl">Extra Large</Button>
                  </Stack>
                </div>

                {/* Button States */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">States</h4>
                  <Stack direction="row" gap="md" wrap>
                    <Button isLoading>Loading</Button>
                    <Button isDisabled>Disabled</Button>
                    <Button fullWidth>Full Width</Button>
                  </Stack>
                </div>

                {/* Button with Icons */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">With Icons</h4>
                  <Stack direction="row" gap="md" wrap>
                    <Button
                      variant="primary"
                      leftIcon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      }
                    >
                      Add New
                    </Button>
                    <Button
                      variant="outline"
                      rightIcon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      }
                    >
                      Continue
                    </Button>
                  </Stack>
                </div>
              </div>
            </CardBody>
          </Card>
        </Container>
      </Section>

      {/* Card Section */}
      <Section background="gray" paddingY="lg">
        <Container>
          <Card>
            <CardHeader
              title="Card Component"
              subtitle="Versatile card with multiple variants and subcomponents"
              action={<Badge variant="primary">New</Badge>}
            />
            <CardBody>
              <div className="space-y-8">
                {/* Card Variants */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Variants</h4>
                  <Stack direction="row" gap="md" wrap>
                    <Card variant="default" padding="md" className="w-48">
                      <p className="text-sm font-medium">Default Card</p>
                    </Card>
                    <Card variant="elevated" padding="md" className="w-48">
                      <p className="text-sm font-medium">Elevated Card</p>
                    </Card>
                    <Card variant="outlined" padding="md" className="w-48">
                      <p className="text-sm font-medium">Outlined Card</p>
                    </Card>
                    <Card variant="flat" padding="md" className="w-48">
                      <p className="text-sm font-medium">Flat Card</p>
                    </Card>
                  </Stack>
                </div>

                {/* Clickable Card */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Interactive Cards</h4>
                  <Stack direction="row" gap="md" wrap>
                    <Card clickable padding="md" className="w-64">
                      <p className="text-sm font-medium mb-2">Clickable Card</p>
                      <p className="text-xs text-gray-500">Click me to interact</p>
                    </Card>
                    <Card hoverable padding="md" className="w-64">
                      <p className="text-sm font-medium mb-2">Hoverable Card</p>
                      <p className="text-xs text-gray-500">Hover to see effect</p>
                    </Card>
                  </Stack>
                </div>

                {/* Card with Header and Footer */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Full Card Example</h4>
                  <Card className="max-w-md">
                    <CardHeader
                      title="Investment Opportunity"
                      subtitle="Agricultural Development Fund"
                    />
                    <CardBody>
                      <div className="space-y-3">
                        <Stack direction="row" justify="between" align="center">
                          <span className="text-sm text-gray-600">Expected Return</span>
                          <span className="text-sm font-semibold text-harvest-green-600">8.5% APY</span>
                        </Stack>
                        <Stack direction="row" justify="between" align="center">
                          <span className="text-sm text-gray-600">Minimum Investment</span>
                          <span className="text-sm font-semibold">$1,000</span>
                        </Stack>
                        <Stack direction="row" justify="between" align="center">
                          <span className="text-sm text-gray-600">Term Length</span>
                          <span className="text-sm font-semibold">12 Months</span>
                        </Stack>
                      </div>
                    </CardBody>
                    <CardFooter>
                      <Button variant="primary" className="flex-1">Invest Now</Button>
                      <Button variant="ghost">Learn More</Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>
            </CardBody>
          </Card>
        </Container>
      </Section>

      {/* Input Section */}
      <Section paddingY="lg">
        <Container>
          <Card>
            <CardHeader title="Input Components" subtitle="Form inputs with labels, validation, and icons" />
            <CardBody>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Basic Inputs */}
                <Stack gap="lg">
                  <h4 className="text-sm font-medium text-gray-700">Basic Inputs</h4>
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <Input
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <Input
                    label="Search"
                    type="search"
                    placeholder="Search investments..."
                    leftIcon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    }
                  />
                </Stack>

                {/* Input States */}
                <Stack gap="lg">
                  <h4 className="text-sm font-medium text-gray-700">Input States</h4>
                  <Input
                    label="Required Field"
                    placeholder="This field is required"
                    isRequired
                  />
                  <Input
                    label="With Error"
                    placeholder="Enter value"
                    error="This field has an error"
                  />
                  <Input
                    label="With Hint"
                    placeholder="Enter value"
                    hint="This helpful text provides guidance"
                  />
                  <Input
                    label="Disabled"
                    placeholder="Cannot edit"
                    isDisabled
                    defaultValue="Disabled value"
                  />
                </Stack>

                {/* Textarea */}
                <Stack gap="lg" className="md:col-span-2">
                  <h4 className="text-sm font-medium text-gray-700">Textarea</h4>
                  <Textarea
                    label="Message"
                    placeholder="Enter your message here..."
                    rows={4}
                    maxLength={500}
                    showCount
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </Stack>
              </div>
            </CardBody>
          </Card>
        </Container>
      </Section>

      {/* Badge Section */}
      <Section background="gray" paddingY="lg">
        <Container>
          <Card>
            <CardHeader title="Badge Component" subtitle="Status indicators with multiple variants" />
            <CardBody>
              <div className="space-y-8">
                {/* Badge Variants */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Variants</h4>
                  <Stack direction="row" gap="md" wrap>
                    <Badge variant="default">Default</Badge>
                    <Badge variant="primary">Primary</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="error">Error</Badge>
                    <Badge variant="info">Info</Badge>
                  </Stack>
                </div>

                {/* Badge Sizes */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Sizes</h4>
                  <Stack direction="row" gap="md" align="center" wrap>
                    <Badge size="sm">Small</Badge>
                    <Badge size="md">Medium</Badge>
                    <Badge size="lg">Large</Badge>
                  </Stack>
                </div>

                {/* Badge Styles */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Styles</h4>
                  <Stack direction="row" gap="md" wrap>
                    <Badge variant="success" isDot>Processing</Badge>
                    <Badge variant="primary" isPill>New</Badge>
                    <Badge variant="warning" isPill>Pending</Badge>
                  </Stack>
                </div>

                {/* Status Badges */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Preset Status Badges</h4>
                  <Stack direction="row" gap="md" wrap>
                    <StatusBadge.Active />
                    <StatusBadge.Pending />
                    <StatusBadge.Inactive />
                    <StatusBadge.Processing />
                    <StatusBadge.Completed />
                    <StatusBadge.Failed />
                    <StatusBadge.Draft />
                    <StatusBadge.New />
                  </Stack>
                </div>
              </div>
            </CardBody>
          </Card>
        </Container>
      </Section>

      {/* Modal Section */}
      <Section paddingY="lg">
        <Container>
          <Card>
            <CardHeader title="Modal Component" subtitle="Dialog overlays with animations and accessibility" />
            <CardBody>
              <Stack direction="row" gap="md" wrap>
                <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                  Open Modal
                </Button>
                <Button variant="outline" onClick={() => setIsLargeModalOpen(true)}>
                  Large Modal
                </Button>
              </Stack>
            </CardBody>
          </Card>
        </Container>
      </Section>

      {/* Container Layout Section */}
      <Section background="gray" paddingY="lg">
        <Container>
          <Card>
            <CardHeader title="Layout Components" subtitle="Container, Section, Stack, and Inline for building layouts" />
            <CardBody>
              <Stack gap="lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Stack (Vertical Layout)</h4>
                  <Stack direction="col" gap="sm" className="bg-harvest-green-50 p-4 rounded-lg">
                    <div className="bg-harvest-green-200 p-3 rounded text-sm">Item 1</div>
                    <div className="bg-harvest-green-300 p-3 rounded text-sm">Item 2</div>
                    <div className="bg-harvest-green-400 p-3 rounded text-sm">Item 3</div>
                  </Stack>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Stack (Horizontal Layout)</h4>
                  <Stack direction="row" gap="sm" className="bg-purple-50 p-4 rounded-lg">
                    <div className="bg-purple-200 p-3 rounded text-sm">Item 1</div>
                    <div className="bg-purple-300 p-3 rounded text-sm">Item 2</div>
                    <div className="bg-purple-400 p-3 rounded text-sm">Item 3</div>
                  </Stack>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Inline (Centered)</h4>
                  <Inline gap="md" align="center" className="bg-amber-50 p-4 rounded-lg">
                    <Badge variant="success">Online</Badge>
                    <span className="text-sm text-gray-600">3 active investments</span>
                    <Badge variant="primary" isDot>Updated just now</Badge>
                  </Inline>
                </div>
              </Stack>
            </CardBody>
          </Card>
        </Container>
      </Section>

      {/* Footer */}
      <Section background="green" paddingY="lg">
        <Container>
          <div className="text-center">
            <p className="text-sm text-harvest-green-700">
              Harvest Finance UI Component System • Built with React, Next.js, and Tailwind CSS
            </p>
          </div>
        </Container>
      </Section>

      {/* Modals */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="md">
        <ModalHeader title="Confirm Action" />
        <ModalBody>
          <p className="text-gray-600">
            Are you sure you want to proceed with this action? This operation cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setIsModalOpen(false)}>
            Confirm
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={isLargeModalOpen} onClose={() => setIsLargeModalOpen(false)} size="lg">
        <ModalHeader title="Investment Details" />
        <ModalBody>
          <Stack gap="lg">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Overview</h4>
              <p className="text-gray-600">
                This agricultural investment opportunity offers sustainable returns while supporting
                local farmers and promoting eco-friendly practices. Your investment helps fund
                equipment, seeds, and sustainable farming techniques.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-harvest-green-50 p-4 rounded-lg">
                <p className="text-sm text-harvest-green-700 font-medium">Projected Annual Return</p>
                <p className="text-2xl font-bold text-harvest-green-800">8.5%</p>
              </div>
              <div className="bg-harvest-green-50 p-4 rounded-lg">
                <p className="text-sm text-harvest-green-700 font-medium">Minimum Investment</p>
                <p className="text-2xl font-bold text-harvest-green-800">$1,000</p>
              </div>
            </div>
            <Textarea
              label="Investment Notes"
              placeholder="Add any notes about this investment..."
              rows={3}
            />
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsLargeModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setIsLargeModalOpen(false)}>
            Invest Now
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
