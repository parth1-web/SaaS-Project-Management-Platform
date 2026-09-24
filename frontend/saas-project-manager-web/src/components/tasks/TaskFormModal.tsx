import { Button, Form, Modal } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';

const schema = z.object({
  title: z.string().min(2, 'Min 2 chars').max(200),
  description: z.string().max(2000).optional(),
  priority: z.number().min(0).max(3),
  status: z.number().min(0).max(3),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof schema>;

export default function TaskFormModal({
  show,
  initial,
  busy,
  onClose,
  onSubmit,
  title = 'Create Task',
}: {
  show: boolean;
  initial?: Partial<TaskFormValues>;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (v: TaskFormValues) => void;
  title?: string;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', priority: 1, status: 0, dueDate: '', assignedTo: '' },
  });

  useEffect(() => {
    if (show) reset({ title: '', description: '', priority: 1, status: 0, dueDate: '', assignedTo: '', ...initial });
  }, [show, initial, reset]);

  return (
    <Modal show={show} onHide={onClose} centered aria-label={title}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Task Title</Form.Label>
            <Form.Control {...register('title')} isInvalid={!!errors.title} autoFocus />
            <Form.Control.Feedback type="invalid">{errors.title?.message}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control as="textarea" rows={3} {...register('description')} isInvalid={!!errors.description} />
            <Form.Control.Feedback type="invalid">{errors.description?.message}</Form.Control.Feedback>
          </Form.Group>
          <div className="row g-2">
            <Form.Group className="col-6">
              <Form.Label>Status</Form.Label>
              <Form.Select {...register('status', { valueAsNumber: true })}>
                <option value={0}>Todo</option>
                <option value={1}>In Progress</option>
                <option value={2}>Review</option>
                <option value={3}>Completed</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="col-6">
              <Form.Label>Priority</Form.Label>
              <Form.Select {...register('priority', { valueAsNumber: true })}>
                <option value={0}>Low</option>
                <option value={1}>Medium</option>
                <option value={2}>High</option>
                <option value={3}>Urgent</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="col-6">
              <Form.Label>Due Date</Form.Label>
              <Form.Control type="date" {...register('dueDate')} />
            </Form.Group>
            <Form.Group className="col-6">
              <Form.Label>Assignee (User ID)</Form.Label>
              <Form.Control placeholder="Optional" {...register('assignedTo')} />
            </Form.Group>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving...' : title.includes('Create') ? 'Create Task' : 'Save'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
