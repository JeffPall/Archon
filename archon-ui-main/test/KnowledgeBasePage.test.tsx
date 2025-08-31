import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { KnowledgeBasePage } from '../src/pages/KnowledgeBasePage';
import { knowledgeBaseService } from '../src/services/knowledgeBaseService';
import { ToastProvider } from '../src/contexts/ToastContext';

// Mock services
vi.mock('../src/services/knowledgeBaseService');
vi.mock('../src/services/socketIOService', () => ({
  knowledgeSocketIO: {
    on: vi.fn(),
    off: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));
vi.mock('../src/services/crawlProgressService', () => ({
  crawlProgressService: {
    streamProgressEnhanced: vi.fn(),
    stopStreaming: vi.fn(),
    disconnect: vi.fn(),
    waitForConnection: vi.fn(),
  },
  CrawlProgressData: vi.fn(),
}));


const mockKnowledgeItems = (count = 20) => ({
  items: Array.from({ length: count }, (_, i) => ({
    id: `id-${i}`,
    source_id: `source-id-${i}`,
    title: `Item ${i + 1}`,
    url: `http://example.com/${i}`,
    metadata: {
      knowledge_type: i % 2 === 0 ? 'technical' : 'business',
      tags: [`tag${i}`],
      source_type: 'url',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
  total: 100,
  page: 1,
  per_page: 20,
  pages: 5,
});

describe('KnowledgeBasePage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();

    // Mock the service call
    knowledgeBaseService.getKnowledgeItems = vi.fn().mockResolvedValue(mockKnowledgeItems());
  });

  test('renders the knowledge base page and loads items', async () => {
    render(
      <ToastProvider>
        <KnowledgeBasePage />
      </ToastProvider>
    );

    // Check for header
    expect(screen.getByText('Knowledge Base')).toBeInTheDocument();

    // Wait for items to be loaded
    await waitFor(() => {
      expect(knowledgeBaseService.getKnowledgeItems).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 20')).toBeInTheDocument();
    });
  });

  test('pagination works correctly', async () => {
    render(
      <ToastProvider>
        <KnowledgeBasePage />
      </ToastProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
    });

    // Click next page
    fireEvent.click(screen.getByText('Next'));

    // Check if the service was called with the new page number
    await waitFor(() => {
      expect(knowledgeBaseService.getKnowledgeItems).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
  });

  test('filtering by type works correctly', async () => {
    render(
      <ToastProvider>
        <KnowledgeBasePage />
      </ToastProvider>
    );

    // Wait for initial load
    await waitFor(() => {
        expect(knowledgeBaseService.getKnowledgeItems).toHaveBeenCalledTimes(1);
    });

    // Click on the 'technical' filter button
    fireEvent.click(screen.getByTitle('Technical/Coding'));

    // Check if the service was called with the correct filter
    await waitFor(() => {
      expect(knowledgeBaseService.getKnowledgeItems).toHaveBeenCalledWith(
        expect.objectContaining({ knowledge_type: 'technical' })
      );
    });
  });

  test('search functionality works with debouncing', async () => {
    render(
      <ToastProvider>
        <KnowledgeBasePage />
      </ToastProvider>
    );

    // Wait for initial load
    await waitFor(() => {
        expect(knowledgeBaseService.getKnowledgeItems).toHaveBeenCalledTimes(1);
    });

    // Type in the search box
    const searchInput = screen.getByPlaceholderText('Search knowledge base...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    // The service should not be called immediately due to debouncing
    expect(knowledgeBaseService.getKnowledgeItems).toHaveBeenCalledTimes(1);

    // Wait for the debounce timeout
    await waitFor(() => {
      expect(knowledgeBaseService.getKnowledgeItems).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test search' })
      );
    }, { timeout: 500 }); // Wait for debounce
  });
});
