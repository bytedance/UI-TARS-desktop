import { CanvasDataSource } from '@renderer/type/canvas';
import { atom, SetStateAction, WritableAtom } from 'jotai';

class CanvasStateManager {
  private baseState: WritableAtom<
    {
      isVisible: boolean;
      dataSource: CanvasDataSource | null;
    },
    [
      SetStateAction<{
        isVisible: boolean;
        dataSource: CanvasDataSource | null;
      }>,
    ],
    void
  >;

  public readonly showCanvas: WritableAtom<boolean, [boolean], void>;
  public readonly dataSource: WritableAtom<
    CanvasDataSource | null,
    [CanvasDataSource | null],
    void
  >;
  public readonly updateState: WritableAtom<
    null,
    [
      {
        isVisible?: boolean;
        dataSource?: CanvasDataSource | null;
      },
    ],
    void
  >;

  constructor(
    initialVisible = false,
    initialDataSource: CanvasDataSource | null = null,
  ) {
    this.baseState = atom({
      isVisible: initialVisible,
      dataSource: initialDataSource,
    });

    this.showCanvas = atom(
      (get) => get(this.baseState).isVisible,
      (get, set, nextVisible: boolean) => {
        const current = get(this.baseState);
        set(this.baseState, { ...current, isVisible: nextVisible });
      },
    );

    this.dataSource = atom(
      (get) => get(this.baseState).dataSource,
      (get, set, nextDataSource: CanvasDataSource | null) => {
        const current = get(this.baseState);
        set(this.baseState, { ...current, dataSource: nextDataSource });
      },
    );

    this.updateState = atom(
      null,
      (
        get,
        set,
        updates: { isVisible?: boolean; dataSource?: CanvasDataSource | null },
      ) => {
        const current = get(this.baseState);
        set(this.baseState, {
          ...current,
          ...updates,
        });
      },
    );
  }
}

export const canvasStateManager = new CanvasStateManager();

export const showCanvasAtom = canvasStateManager.showCanvas;
export const canvasDataSourceAtom = canvasStateManager.dataSource;
export const updateCanvasStateAtom = canvasStateManager.updateState;
