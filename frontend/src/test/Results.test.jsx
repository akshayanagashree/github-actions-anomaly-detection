import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import ScoreMeter from '../components/results/ScoreMeter';
import StructuralFeaturesCard from '../components/results/StructuralFeaturesCard';
import FindingsTable from '../components/results/FindingsTable';
import RecommendationsCard from '../components/results/RecommendationsCard';
import ResultsPage from '../pages/ResultsPage';
import { MOCK_ANOMALY_RESULT, MOCK_NORMAL_RESULT } from '../data/mockResults';

describe('ScoreMeter Component Suite', () => {
  it('renders raw anomaly score and threshold', () => {
    render(
      <ScoreMeter
        score={0.884}
        threshold={0.5}
        interpretation="Significant structural deviation"
        isAnomaly={true}
      />
    );

    expect(screen.getByText('0.884')).toBeInTheDocument();
    expect(screen.getByText(/Threshold: 0.500/i)).toBeInTheDocument();
    expect(screen.getByText(/Significant structural deviation/i)).toBeInTheDocument();
  });

  it('displays explicit disclaimer that scores are not probabilities', () => {
    render(<ScoreMeter score={0.2} threshold={0.5} isAnomaly={false} />);
    expect(
      screen.getByText(/do not represent calibrated probability or intent/i)
    ).toBeInTheDocument();
  });
});

describe('StructuralFeaturesCard Component Suite', () => {
  it('renders AST features including jobs, steps, and runners', () => {
    render(<StructuralFeaturesCard features={MOCK_ANOMALY_RESULT.structural_features} />);

    expect(screen.getByText('Total Jobs')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
    expect(screen.getByText(/Self-Hosted Detected/i)).toBeInTheDocument();
    expect(screen.getByText(/Elevated Privileges/i)).toBeInTheDocument();
  });
});

describe('FindingsTable Component Suite', () => {
  it('distinguishes ML detections from AST rule findings', () => {
    render(<FindingsTable findings={MOCK_ANOMALY_RESULT.findings} />);

    expect(screen.getByText(/ML Statistical Anomaly/i)).toBeInTheDocument();
    expect(screen.getAllByText(/AST Structural Rule/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Unverified Self-Hosted Runner Introduced/i)).toBeInTheDocument();
    expect(screen.getByText(/Critical/i)).toBeInTheDocument();
  });

  it('renders clean state when findings list is empty', () => {
    render(<FindingsTable findings={[]} />);
    expect(
      screen.getByText(/No Structural Vulnerabilities Detected/i)
    ).toBeInTheDocument();
  });
});

describe('RecommendationsCard Component Suite', () => {
  it('renders recommendations and warning alerts', () => {
    render(
      <RecommendationsCard
        recommendations={MOCK_ANOMALY_RESULT.recommendations}
        warnings={MOCK_ANOMALY_RESULT.warnings}
      />
    );

    expect(screen.getByText(/Recommended Security Actions/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Isolate self-hosted runners inside ephemeral/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Workflow Warnings \(2\)/i)).toBeInTheDocument();
  });
});

describe('ResultsPage Full Integration Suite', () => {
  it('renders anomaly workflow details by default', () => {
    render(<ResultsPage />);

    expect(screen.getByText('release-pipeline.yml')).toBeInTheDocument();
    expect(screen.getByText('0.884')).toBeInTheDocument();
    expect(screen.getByText(/IsolationForest-v1.0/i)).toBeInTheDocument();
  });

  it('switches to normal workflow case when clicking fixture switcher', () => {
    render(<ResultsPage />);

    const normalBtn = screen.getByRole('button', { name: /Normal Case/i });
    fireEvent.click(normalBtn);

    expect(screen.getByText('ci.yml')).toBeInTheDocument();
    expect(screen.getByText('0.112')).toBeInTheDocument();
    expect(screen.getByText(/Normal Workflow/i)).toBeInTheDocument();
  });
});
