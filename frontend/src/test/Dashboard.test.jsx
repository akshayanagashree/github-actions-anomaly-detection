import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import App from '../App';
import * as analysisService from '../services/analysisService';

describe('Phase 2 UI Component Test Suite', () => {
  it('renders StatCard with correct title and value', () => {
    render(
      <StatCard
        title="Total Workflows"
        value={148}
        change="+12% this week"
        trend="up"
        color="blue"
      />
    );
    expect(screen.getByText(/Total Workflows/i)).toBeInTheDocument();
    expect(screen.getByText('148')).toBeInTheDocument();
    expect(screen.getByText(/\+12% this week/i)).toBeInTheDocument();
  });

  it('renders Badge with custom variants', () => {
    const { rerender } = render(<Badge variant="danger">Anomaly Detected</Badge>);
    expect(screen.getByText('Anomaly Detected')).toBeInTheDocument();

    rerender(<Badge variant="success">Normal</Badge>);
    expect(screen.getByText('Normal')).toBeInTheDocument();
  });

  it('renders Table data rows correctly', () => {
    const columns = [
      { key: 'filename', header: 'File' },
      { key: 'status', header: 'Status' },
    ];
    const data = [
      { id: 1, filename: 'ci.yml', status: 'NORMAL' },
      { id: 2, filename: 'deploy.yml', status: 'ANOMALY' },
    ];

    render(<Table columns={columns} data={data} keyField="id" />);
    expect(screen.getByText('ci.yml')).toBeInTheDocument();
    expect(screen.getByText('deploy.yml')).toBeInTheDocument();
  });

  it('displays empty state when Table receives no records', () => {
    const columns = [{ key: 'name', header: 'Name' }];
    render(<Table columns={columns} data={[]} emptyMessage="No workflows available" />);
    expect(screen.getByText('No workflows available')).toBeInTheDocument();
  });
});

describe('Phase 2 App Navigation Integration', () => {
  beforeEach(() => {
    vi.spyOn(analysisService, 'checkBackendHealth').mockResolvedValue({
      status: 'ok',
      model_loaded: true,
      model_type: 'IsolationForest',
      database_connected: true,
    });
    vi.spyOn(analysisService, 'getHistory').mockResolvedValue({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
    });
  });

  it('renders Dashboard by default with 4 top security metrics', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Security Overview Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Workflows/i)).toBeInTheDocument();
      expect(screen.getByText(/Normal Workflows/i)).toBeInTheDocument();
      expect(screen.getByText(/Potential Anomalies/i)).toBeInTheDocument();
      expect(screen.getByText(/Anomaly Rate/i)).toBeInTheDocument();
    });
  });

  it('switches to Upload page when clicking Upload in sidebar', async () => {
    render(<App />);
    const uploadButtons = screen.getAllByRole('button', { name: /Upload/i });
    // Click the first upload button (e.g. sidebar navigation)
    fireEvent.click(uploadButtons[0]);
    await waitFor(() => {
      expect(screen.getByText(/Upload & Analyze Workflow/i)).toBeInTheDocument();
    });
  });
});
