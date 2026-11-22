import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { validateWorkflowFile, formatFileSize } from '../utils/fileValidators';
import FileUploadZone from '../components/common/FileUploadZone';
import UploadPage from '../pages/UploadPage';
import * as analysisService from '../services/analysisService';

describe('Workflow File Validation Suite', () => {
  it('accepts valid .yml and .yaml workflow files', () => {
    const ymlFile = new File(['name: CI\non: push'], 'ci.yml', { type: 'text/yaml' });
    const yamlFile = new File(['name: Deploy\non: release'], 'deploy.yaml', { type: 'text/yaml' });

    expect(validateWorkflowFile(ymlFile).isValid).toBe(true);
    expect(validateWorkflowFile(yamlFile).isValid).toBe(true);
  });

  it('rejects invalid file formats', () => {
    const txtFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    const jsonFile = new File(['{}'], 'package.json', { type: 'application/json' });

    const txtRes = validateWorkflowFile(txtFile);
    expect(txtRes.isValid).toBe(false);
    expect(txtRes.error).toContain('Only .yml and .yaml');

    const jsonRes = validateWorkflowFile(jsonFile);
    expect(jsonRes.isValid).toBe(false);
  });

  it('rejects empty files (0 bytes)', () => {
    const emptyFile = new File([], 'empty.yml', { type: 'text/yaml' });
    const res = validateWorkflowFile(emptyFile);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('is empty (0 bytes)');
  });

  it('rejects files exceeding size limit', () => {
    // 3MB file
    const largeContent = new Uint8Array(3 * 1024 * 1024);
    const largeFile = new File([largeContent], 'large-workflow.yml', { type: 'text/yaml' });
    const res = validateWorkflowFile(largeFile, 2 * 1024 * 1024);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('exceeds the maximum allowed limit');
  });

  it('correctly formats file sizes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2 MB');
  });
});

describe('FileUploadZone Component Suite', () => {
  it('renders zone label and browse prompt', () => {
    render(
      <FileUploadZone
        id="test-zone"
        label="Test Workflow"
        description="Select workflow YAML"
      />
    );
    expect(screen.getByText('Test Workflow')).toBeInTheDocument();
    expect(screen.getByText(/Click to browse/i)).toBeInTheDocument();
  });

  it('displays selected file details and handles remove action', () => {
    const onRemove = vi.fn();
    const testFile = new File(['name: build'], 'build.yml', { type: 'text/yaml' });

    render(
      <FileUploadZone
        id="test-zone"
        selectedFile={testFile}
        onFileRemove={onRemove}
      />
    );

    expect(screen.getByText('build.yml')).toBeInTheDocument();
    expect(screen.getByText(/Validated/i)).toBeInTheDocument();

    const removeBtn = screen.getByTitle('Remove File');
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalled();
  });

  it('displays validation error when an invalid file is dropped', () => {
    render(<FileUploadZone id="test-zone" />);
    const input = screen.getByTestId('file-input-test-zone');

    const invalidFile = new File(['dummy'], 'virus.exe', { type: 'application/x-msdownload' });
    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(screen.getByText(/Validation Error/i)).toBeInTheDocument();
    expect(screen.getByText(/Only .yml and .yaml/i)).toBeInTheDocument();
  });
});

describe('UploadPage Full Workflow Integration', () => {
  it('disables Analyze button when no file is selected', () => {
    render(<UploadPage />);
    const analyzeBtn = screen.getByRole('button', { name: /Analyze Workflow/i });
    expect(analyzeBtn).toBeDisabled();
  });

  it('toggles baseline workflow file zone when baseline comparison is clicked', () => {
    render(<UploadPage />);
    expect(screen.queryByText('Baseline Workflow File')).not.toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(toggleBtn);

    expect(screen.getByText('Baseline Workflow File')).toBeInTheDocument();
  });

  it('processes workflow file and displays success result', async () => {
    vi.spyOn(analysisService, 'analyzeWorkflow').mockResolvedValueOnce({
      analysis_id: 'ana_test123',
      filename: 'ci.yml',
      status: 'success',
      created_at: new Date().toISOString(),
      has_baseline: false,
      baseline_filename: null,
      workflow_summary: {
        name: 'CI',
        total_jobs: 1,
        total_steps: 1,
        runners: ['ubuntu-latest'],
        triggers: ['push'],
      },
      anomaly_score: 0.124,
      threshold: 0.5373,
      is_anomaly: false,
      classification: 'normal',
      score_interpretation: 'Conforms to baseline',
      findings: ['Valid workflow topology'],
    });

    render(<UploadPage />);
    const input = screen.getByTestId('file-input-primary-workflow');

    const validWorkflow = new File(['name: CI\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest'], 'ci.yml', {
      type: 'text/yaml',
    });

    fireEvent.change(input, { target: { files: [validWorkflow] } });

    expect(screen.getByText('ci.yml')).toBeInTheDocument();
    const analyzeBtn = screen.getByRole('button', { name: /Analyze Workflow/i });
    expect(analyzeBtn).toBeEnabled();

    fireEvent.click(analyzeBtn);

    // Should enter analyzing state
    expect(screen.getByText(/Analyzing Pipeline.../i)).toBeInTheDocument();

    // Wait for analysis result to resolve
    await waitFor(
      () => {
        expect(screen.getByText(/Analysis Generated Successfully/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByText(/View Structural Results/i)).toBeInTheDocument();
  });
});
