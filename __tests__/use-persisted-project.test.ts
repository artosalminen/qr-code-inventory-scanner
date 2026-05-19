import { renderHook, act } from '@testing-library/react';
import { usePersistedProject } from '@/lib/use-persisted-project';
import { Project } from '@/types';

function makeProject(id: string): Project {
  return {
    id,
    name: `Project ${id}`,
    description: null,
    csvUploadedAt: null,
    defaultQrMode: 'check-in',
    status: 'active',
    createdBy: 'user1',
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('usePersistedProject', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty string when projects list is empty', () => {
    const { result } = renderHook(() => usePersistedProject([]));
    expect(result.current[0]).toBe('');
  });

  it('selects first project when localStorage is empty', () => {
    const projects = [makeProject('p1'), makeProject('p2')];
    const { result } = renderHook(() => usePersistedProject(projects));
    expect(result.current[0]).toBe('p1');
  });

  it('selects stored project when it exists in the list', () => {
    localStorage.setItem('selectedProjectId', 'p2');
    const projects = [makeProject('p1'), makeProject('p2')];
    const { result } = renderHook(() => usePersistedProject(projects));
    expect(result.current[0]).toBe('p2');
  });

  it('falls back to first project when stored id is not in the list', () => {
    localStorage.setItem('selectedProjectId', 'archived-or-deleted-id');
    const projects = [makeProject('p1'), makeProject('p2')];
    const { result } = renderHook(() => usePersistedProject(projects));
    expect(result.current[0]).toBe('p1');
  });

  it('persists selection to localStorage on change', () => {
    const projects = [makeProject('p1'), makeProject('p2')];
    const { result } = renderHook(() => usePersistedProject(projects));
    act(() => {
      result.current[1]('p2');
    });
    expect(result.current[0]).toBe('p2');
    expect(localStorage.getItem('selectedProjectId')).toBe('p2');
  });

  it('does not reset selection when projects list re-renders with a new array reference', () => {
    const projects = [makeProject('p1'), makeProject('p2')];
    const { result, rerender } = renderHook(
      ({ ps }: { ps: Project[] }) => usePersistedProject(ps),
      { initialProps: { ps: projects } },
    );
    act(() => { result.current[1]('p2'); });
    rerender({ ps: [...projects] });
    expect(result.current[0]).toBe('p2');
  });
});
