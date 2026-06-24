import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WaitersManager from '../WaitersManager';
import { BrowserRouter } from 'react-router-dom';

// --- MOCKS DE CONTEXTO ---
// Importante: Mockeamos el path absoluto-relativo a la raíz para que Vitest lo unifique
// y el componente lo vea correctamente.

const mockSubscriptionValue = {
  restaurantId: 'res123',
  isBranchAllowed: () => true,
  userProfile: { role: 'owner' },
  isActive: true,
  subscription: { status: 'active' },
  planLevel: 2
};

vi.mock('../../../context/SubscriptionContext', () => ({
  useSubscription: () => mockSubscriptionValue,
  SubscriptionProvider: ({ children }) => <>{children}</>,
  PLAN_NAMES: { 0: 'Gratis', 1: 'Carta', 2: 'Carta y Mesa' }
}));

// También mockeamos la ruta que usa el componente internamente por si acaso
vi.mock('../../../context/SubscriptionContext', () => ({
  useSubscription: () => mockSubscriptionValue,
  SubscriptionProvider: ({ children }) => <>{children}</>,
  PLAN_NAMES: { 0: 'Gratis', 1: 'Carta', 2: 'Carta y Mesa' }
}));

vi.mock('../../../context/AlertContext', () => ({
  useAlert: () => ({
    showAlert: vi.fn((msg, title, type, cb) => { if (cb) cb(); })
  }),
  AlertProvider: ({ children }) => <>{children}</>
}));

// Mocks de servicios
vi.mock('../../../services/staffService', () => ({
  getUnifiedTeam: vi.fn(),
  saveUnifiedMember: vi.fn(),
  deleteUnifiedMember: vi.fn()
}));

vi.mock('../../../services/branchService', () => ({
  getBranches: vi.fn()
}));

vi.mock('../../../services/attendanceService', () => ({
  checkInWaiter: vi.fn(),
  checkOutWaiter: vi.fn()
}));

import * as staffService from '../../../services/staffService';
import * as branchService from '../../../services/branchService';
import * as attendanceService from '../../../services/attendanceService';

describe('WaitersManager - Tests de Asistencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    branchService.getBranches.mockResolvedValue([{ id: 'br1', name: 'Sede Principal' }]);
    
    staffService.getUnifiedTeam.mockResolvedValue([
      {
        id: 'waiter1',
        name: 'Mesero Test',
        role: 'mesero',
        mode: 'personal',
        dashboardEmail: 'mesero@test.com',
        pin: '1234',
        isCheckedIn: false,
        assignedBranchIds: []
      }
    ]);
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <WaitersManager />
      </BrowserRouter>
    );
  };

  it('Paso 1: Muestra al mesero en la tabla', async () => {
    renderComponent();
    // Aumentamos el timeout y usamos findAll para mayor flexibilidad
    const elements = await screen.findAllByText(/Mesero Test/i, {}, { timeout: 8000 });
    expect(elements[0]).toBeInTheDocument();
  });

  it('Paso 2: Realiza el flujo de Check-In con PIN', async () => {
    renderComponent();

    await screen.findAllByText(/Mesero Test/i, {}, { timeout: 8000 });
    
    const btn = screen.getByRole('button', { name: /Iniciar Turno/i });
    fireEvent.click(btn);

    // El modal ahora debería estar visible en el DOM
    expect(screen.getByText(/Ingresa el PIN de/i)).toBeInTheDocument();

    const pinInput = screen.getByPlaceholderText('****');
    fireEvent.change(pinInput, { target: { value: '1234' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirmar/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(attendanceService.checkInWaiter).toHaveBeenCalled();
    });
  });
});
