import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TestApp } from '@/features/auth/tests/render';
import { clientA } from '@/features/auth/tests/fixtures';
import { authServer, resetAuthMockState } from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { clientBodyCopy } from '@/features/client-body/copy';
import { clientProgressCopy } from '@/features/client-progress/copy';
import { progressMockState, resetProgressMockState } from '@/features/client-progress/tests/msw-progress';
import { populatedProgressSummary, previousProgressSummary, populatedExerciseList, populatedBodyList } from '@/features/client-progress/tests/fixtures';
import {
  bodyMockState,
  resetBodyMockState,
  setMeasurementList,
} from '@/features/client-body/tests/msw-body';
import {
  emptyMeasurementList,
  partialMeasurementList,
  populatedMeasurementList,
  populatedReadyPhotos,
  pendingPhoto,
} from '@/features/client-body/tests/fixtures';
import { emptyPhotoList } from '@/features/client-body/tests/fixtures';

const timeout = 4000;

function renderBody(entry = '/client/body') {
  return render(
    <TestApp initialEntry={entry} status="AUTHENTICATED" user={clientA} />,
  );
}

describe('Client body progress', { timeout: 15_000 }, () => {
  beforeAll(async () => {
    await import('@/features/client-body/components/client-body-page');
  });
  beforeEach(() => {
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetProgressMockState();
    resetBodyMockState();
    resetAuthBootstrap();
    clearAccessToken();
  });

  afterEach(() => {
    authServer.resetHandlers();
    authServer.close();
    resetAuthBootstrap();
    clearAccessToken();
  });

  it('shows a skeleton instead of Loading...', async () => {
    progressMockState.delayMs = 2_000;
    bodyMockState.delayMs = 2_000;
    renderBody();
    expect(
      await screen.findByRole('heading', { name: clientBodyCopy.title }, { timeout }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: clientBodyCopy.loadingLabel }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders measurements, decimals, and empty photos', async () => {
    setMeasurementList(populatedMeasurementList);
    renderBody();
    expect(await screen.findByText('81.25 kg', {}, { timeout })).toBeInTheDocument();
    expect(screen.getByText('81.2 cm')).toBeInTheDocument();
    expect(screen.getByText('16.5%')).toBeInTheDocument();
    expect(screen.getByText(clientBodyCopy.photos.emptyTitle)).toBeInTheDocument();
    expect(screen.queryByText('BMI')).not.toBeInTheDocument();
  });

  it('shows an honest empty measurement state without fake metrics', async () => {
    setMeasurementList(emptyMeasurementList);
    renderBody();
    expect(
      await screen.findByRole('heading', { name: clientBodyCopy.measurements.emptyTitle }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.queryByText('0 kg')).not.toBeInTheDocument();
  });

  it('omits missing optional metrics without breaking', async () => {
    setMeasurementList(partialMeasurementList);
    renderBody();
    expect(await screen.findByText('80 kg', {}, { timeout })).toBeInTheDocument();
    expect(screen.queryByText(clientBodyCopy.metrics.waistCm)).not.toBeInTheDocument();
  });

  it('creates a measurement from the form', async () => {
    const user = userEvent.setup();
    setMeasurementList(emptyMeasurementList);
    renderBody();
    await screen.findByRole('heading', { name: clientBodyCopy.measurements.emptyTitle }, { timeout });
    await user.click(screen.getByRole('button', { name: clientBodyCopy.measurements.add }));
    await user.type(screen.getByLabelText(/Weight/), '79.5');
    await user.click(screen.getByRole('button', { name: clientBodyCopy.measurements.save }));
    expect(await screen.findByText('79.5 kg', {}, { timeout })).toBeInTheDocument();
  });

  it('retries a recoverable error without leaving the Client shell', async () => {
    const user = userEvent.setup();
    progressMockState.bodyStatus = 500;
    renderBody();
    expect(
      await screen.findByRole('button', { name: clientBodyCopy.error.retry }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    progressMockState.bodyStatus = 200;
    setMeasurementList(populatedMeasurementList);
    await user.click(screen.getByRole('button', { name: clientBodyCopy.error.retry }));
    expect(await screen.findByText('81.25 kg', {}, { timeout })).toBeInTheDocument();
  });

  it('opens Body progress from the Progress CTA', async () => {
    const user = userEvent.setup();
    progressMockState.summary = populatedProgressSummary;
    progressMockState.previousSummary = previousProgressSummary;
    progressMockState.exercises = populatedExerciseList;
    progressMockState.body = populatedBodyList;
    renderBody('/client/progress');
    await user.click(
      await screen.findByRole('link', { name: clientProgressCopy.body.viewBody }, { timeout }),
    );
    expect(
      await screen.findByRole('heading', { name: clientBodyCopy.title }, { timeout }),
    ).toBeInTheDocument();
  });

  it('renders ready photos and compare controls', async () => {
    setMeasurementList(populatedMeasurementList);
    bodyMockState.photosReady = populatedReadyPhotos;
    renderBody();
    expect(await screen.findByRole('heading', { name: clientBodyCopy.compare.title }, { timeout })).toBeInTheDocument();
    expect(screen.getAllByText('Front').length).toBeGreaterThan(0);
    expect(screen.getByLabelText(clientBodyCopy.compare.first)).toBeInTheDocument();
  });

  it('uploads a photo through signed POST then finalize', async () => {
    const user = userEvent.setup();
    setMeasurementList(populatedMeasurementList);
    bodyMockState.photosReady = emptyPhotoList;
    renderBody();
    await screen.findByRole('heading', { name: clientBodyCopy.photos.emptyTitle }, { timeout });
    await user.click(screen.getByRole('button', { name: clientBodyCopy.photos.add }));
    const file = new File(['fake-bytes'], 'front.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(clientBodyCopy.photos.file), file);
    fireEvent.click(screen.getByRole('dialog'), { clientX: 0, clientY: 0 });
    expect(screen.getByText('front.jpg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: clientBodyCopy.photos.close })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: clientBodyCopy.photos.upload }));
    expect(bodyMockState.lastStoragePosted).toBe(true);
    expect(bodyMockState.lastUploadRequest?.mimeType).toBe('image/jpeg');
  });

  it('keeps Cancel enabled and closes while object storage is hanging', async () => {
    const user = userEvent.setup();
    bodyMockState.hangStorage = true;
    setMeasurementList(populatedMeasurementList);
    bodyMockState.photosReady = emptyPhotoList;
    renderBody();
    await screen.findByRole('heading', { name: clientBodyCopy.photos.emptyTitle }, { timeout });
    await user.click(screen.getByRole('button', { name: clientBodyCopy.photos.add }));
    const file = new File(['fake-bytes'], 'front.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(clientBodyCopy.photos.file), file);
    await user.click(screen.getByRole('button', { name: clientBodyCopy.photos.upload }));
    const cancel = await screen.findByRole('button', { name: clientBodyCopy.photos.close });
    expect(cancel).toBeEnabled();
    await user.click(cancel);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows pending upload status without treating it as ready', async () => {
    setMeasurementList(emptyMeasurementList);
    bodyMockState.photosPending = {
      data: [pendingPhoto],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    };
    renderBody();
    expect(await screen.findByText(/Upload pending/, {}, { timeout })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
