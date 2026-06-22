import { dict, type Strings } from './dictionary'
import { useAppStore } from '../store/useAppStore'
export function useT(): Strings { return dict[useAppStore((s) => s.lang)] }
