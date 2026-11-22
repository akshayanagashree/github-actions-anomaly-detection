import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import * as analysisService from '../services/analysisService';

describe('App Component Root Suite', () => {
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

  it('renders application shell and cybersecurity dashboard view', async () => {
    render(<App />);
    const brandElements = screen.getAllByText(/SecWorkflow ML/i);
    expect(brandElements.length).toBeGreaterThanOrEqual(1);
    await waitFor(() => {
      expect(screen.getByText(/Security Overview Dashboard/i)).toBeInTheDocument();
    });
  });
});
