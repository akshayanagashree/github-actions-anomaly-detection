import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import DiffSummaryBar from '../components/comparison/DiffSummaryBar';
import StructuredDiffSection from '../components/comparison/StructuredDiffSection';
import SideBySideViewer from '../components/comparison/SideBySideViewer';
import ComparisonPage from '../pages/ComparisonPage';
import { MOCK_COMPARISON_SCENARIOS } from '../data/mockComparison';

describe('DiffSummaryBar Component Suite', () => {
  it('renders change counts and filenames correctly', () => {
    const summary = {
      totalChanges: 14,
      additionsCount: 5,
      removalsCount: 2,
      modificationsCount: 7,
    };

    render(
      <DiffSummaryBar
        baselineFilename="base.yml"
        modifiedFilename="target.yml"
        summary={summary}
      />
    );

    expect(screen.getByText('base.yml')).toBeInTheDocument();
    expect(screen.getByText('target.yml')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('+5')).toBeInTheDocument();
    expect(screen.getByText('-2')).toBeInTheDocument();
    expect(screen.getByText('~7')).toBeInTheDocument();
  });
});

describe('StructuredDiffSection Component Suite', () => {
  it('renders added and removed jobs with proper badges', () => {
    render(
      <StructuredDiffSection
        differences={MOCK_COMPARISON_SCENARIOS.drift.structuralDifferences}
      />
    );

    expect(screen.getAllByText(/Job Added:/i).length).toBeGreaterThan(0);
    expect(screen.getByText('publish-artifacts')).toBeInTheDocument();
    expect(screen.getAllByText('+ Added Job').length).toBeGreaterThan(0);

    expect(screen.getByText(/Job Removed:/i)).toBeInTheDocument();
    expect(screen.getByText('legacy-node16-check')).toBeInTheDocument();
  });

  it('renders runner and permission escalations', () => {
    render(
      <StructuredDiffSection
        differences={MOCK_COMPARISON_SCENARIOS.drift.structuralDifferences}
      />
    );

    expect(screen.getByText(/Runner Modifications/i)).toBeInTheDocument();
    expect(screen.getAllByText(/self-hosted-prod-arm64/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Permission Scope Alterations/i)).toBeInTheDocument();
    expect(screen.getByText(/write-all/i)).toBeInTheDocument();
  });
});

describe('SideBySideViewer Component Suite', () => {
  it('renders dual-pane code comparison blocks', () => {
    render(
      <SideBySideViewer
        baselineFilename="baseline.yml"
        modifiedFilename="target.yml"
        blocks={MOCK_COMPARISON_SCENARIOS.drift.blocks}
      />
    );

    expect(screen.getByText(/Side-by-Side Structural Inspection/i)).toBeInTheDocument();
    expect(screen.getByText('Triggers (on:)')).toBeInTheDocument();
    expect(screen.getByText('Permissions')).toBeInTheDocument();
  });
});

describe('ComparisonPage Full View Integration', () => {
  it('renders comparison page with default drift scenario', () => {
    render(<ComparisonPage />);

    expect(screen.getByText(/Structural AST Comparison/i)).toBeInTheDocument();
    expect(screen.getByText('baseline-deploy.yml')).toBeInTheDocument();
    expect(screen.getByText('deploy-production.yml')).toBeInTheDocument();
    expect(screen.getByText(/Objective Structural Differentiation/i)).toBeInTheDocument();
  });

  it('switches view mode from categorized to side-by-side', () => {
    render(<ComparisonPage />);

    const sideBySideBtn = screen.getByRole('button', { name: /Side-by-Side Dual Pane/i });
    fireEvent.click(sideBySideBtn);

    expect(screen.getByText(/Side-by-Side Structural Inspection/i)).toBeInTheDocument();
  });

  it('switches comparison scenarios via scenario buttons', () => {
    render(<ComparisonPage />);

    const routineBtn = screen.getByRole('button', { name: /Routine Upgrade/i });
    fireEvent.click(routineBtn);

    expect(screen.getByText('ci-v1.4.yml')).toBeInTheDocument();
    expect(screen.getByText('ci-v1.5.yml')).toBeInTheDocument();
  });
});
