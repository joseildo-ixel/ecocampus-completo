import axios from 'axios';
import type { ApiErrorPayload, PageMeta } from './types';

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('; ');
    if (message) return message;
    return error.message || 'Não foi possível concluir a solicitação.';
  }
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value));
}

export function formatKg(value: number): string {
  return `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
}

export function pageCount(meta?: PageMeta): number {
  return meta?.totalPages ?? 0;
}
