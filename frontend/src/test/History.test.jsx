import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import HistoryPage from '../pages/HistoryPage';
import * as analysisService from '../services/analysisService';

describe('HistoryPage Component Suite', () => {
  it('renders loading state initially and then empty state when no records exist', async () => {
    vi.spyOn(analysisService, 'getHistory').mockResolvedValueOnce({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
    });

    render(<HistoryPage />);

    expect(screen.getByText(/Loading analysis records from FastAPI.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/No Analysis Records Found/i)).toBeInTheDocument();
    });
  });

  it('renders history records from API response', async () => {
    const mockItems = [
      {
        analysis_id: 'ana_12345',
        filename: 'deploy.yml',
        has_baseline: true,
        baseline_filename: 'base.yml',
        status: 'success',
        anomaly_score: 0.842,
        classification: 'anomalous',
        score_interpretation: 'Significant structural outlier',
        total_jobs: 3,
        total_steps: 12,
        total_differences: 4,
        high_severity_differences: 2,
        created_at: '2026-11-22T10:00:00Z',
      },
      {
        analysis_id: 'ana_67890',
        filename: 'ci.yml',
        has_baseline: false,
        baseline_filename: null,
        status: 'success',
        anomaly_score: 0.124,
        classification: 'normal',
        score_interpretation: 'Conforms to baseline',
        total_jobs: 2,
        total_steps: 6,
        total_differences: 0,
        high_severity_differences: 0,
        created_at: '2026-11-22T09:30:00Z',
      },
    ];

    vi.spyOn(analysisService, 'getHistory').mockResolvedValueOnce({
      items: mockItems,
      total: 2,
      limit: 50,
      offset: 0,
    });

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('deploy.yml')).toBeInTheDocument();
      expect(screen.getByText('ci.yml')).toBeInTheDocument();
      expect(screen.getByText(/4 diffs/i)).toBeInTheDocument();
      expect(screen.getByText(/0.842/i)).toBeInTheDocument();
    });
  });

  it('filters history items by search query', async () => {
    const mockItems = [
      {
        analysis_id: 'ana_111',
        filename: 'payment-service.yml',
        status: 'success',
        anomaly_score: 0.72,
        classification: 'anomalous',
        total_jobs: 2,
        total_steps: 8,
        total_differences: 0,
        created_at: '2026-11-22T10:00:00Z',
      },
      {
        analysis_id: 'ana_222',
        filename: 'frontend-build.yml',
        status: 'success',
        anomaly_score: 0.15,
        classification: 'normal',
        total_jobs: 1,
        total_steps: 4,
        total_differences: 0,
        created_at: '2026-11-22T09:00:00Z',
      },
    ];

    vi.spyOn(analysisService, 'getHistory').mockResolvedValueOnce({
      items: mockItems,
      total: 2,
      limit: 50,
      offset: 0,
    });

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('payment-service.yml')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by filename/i);
    fireEvent.change(searchInput, { target: { value: 'payment' } });

    expect(screen.getByText('payment-service.yml')).toBeInTheDocument();
    expect(screen.queryByText('frontend-build.yml')).not.toBeInTheDocument();
  });

  it('loads demo fixtures when Load Demo Fixtures button is clicked', async () => {
    vi.spyOn(analysisService, 'getHistory').mockResolvedValueOnce({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
    });

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/No Analysis Records Found/i)).toBeInTheDocument();
    });

    const demoBtn = screen.getByRole('button', { name: /Load Demo Fixtures/i });
    fireEvent.click(demoBtn);

    expect(screen.getByText(/Demo Telemetry Mode/i)).toBeInTheDocument();
    expect(screen.getByText('release-pipeline.yml')).toBeInTheDocument();
  });
});
