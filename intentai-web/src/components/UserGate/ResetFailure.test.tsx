// Handing a phone to the next participant must not outrun the last one's journal photos.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../../App';
import { deleteAllPhotos } from '../../data/journal/photos';
import { testerStore } from '../../data/stores';
import { renderAt } from '../../pages/MySpacePage/testUtils';

vi.mock('../../data/journal/photos', async (original) => ({
  ...(await original<typeof import('../../data/journal/photos')>()),
  deleteAllPhotos: vi.fn(),
}));

const photos = vi.mocked(deleteAllPhotos);
const assign = vi.fn();
const replace = vi.fn();

beforeEach(() => {
  photos.mockReset();
  assign.mockReset();
  replace.mockReset();
  vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, assign, replace } as Location);
});

afterEach(() => {
  testerStore.set({ name: '' });
  vi.restoreAllMocks();
});

test('/restart stays put and offers a retry, with the phone version, when photos could not be deleted', async () => {
  photos.mockResolvedValue(false);
  testerStore.set({ name: 'P05', version: 'A' });
  renderAt('/restart');
  expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent(/journal photos could not be cleared/i);
  expect(assign).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(assign).toHaveBeenCalledWith('/restart?v=A');
});

test('/restart waits for the second clear and goes by its result', async () => {
  let finish: (done: boolean) => void = () => {};
  photos.mockResolvedValueOnce(false).mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
  testerStore.set({ name: 'P05', version: 'A' });
  renderAt('/restart');
  await vi.waitFor(() => expect(photos).toHaveBeenCalledTimes(2), { timeout: 3000 });
  expect(assign).not.toHaveBeenCalled();
  finish(true);
  await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/?v=A'));
});

test('/restart keeps the version a retry brought with it, after the tester is gone', async () => {
  photos.mockResolvedValue(true);
  testerStore.set({ name: '' });
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/restart?v=A']}>
      <App />
    </MemoryRouter>,
  );
  await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/?v=A'), { timeout: 3000 });
});

test('/t4 does not seed the prepared profile when photos could not be deleted', async () => {
  photos.mockResolvedValue(false);
  testerStore.set({ name: 'P06', version: 'B' });
  renderAt('/t4');
  expect(await screen.findByRole('alert')).toHaveTextContent(/journal photos could not be cleared/i);
  expect(replace).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(assign).toHaveBeenCalledWith('/t4');
});

test('Restart in Settings hands over to /restart, with the version, when photos could not be deleted', async () => {
  photos.mockResolvedValue(false);
  testerStore.set({ name: 'P03', version: 'B' });
  renderAt('/my-space/settings');
  await userEvent.click(screen.getByRole('button', { name: /Restart test/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Restart' }));
  await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/restart?v=B'), { timeout: 3000 });
  expect(assign).not.toHaveBeenCalledWith('/?v=B');
});
