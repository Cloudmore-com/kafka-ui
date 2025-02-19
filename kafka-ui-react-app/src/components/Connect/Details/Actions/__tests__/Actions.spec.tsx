import React from 'react';
import { render, WithRoute } from 'lib/testHelpers';
import { clusterConnectConnectorPath } from 'lib/paths';
import Actions from 'components/Connect/Details/Actions/Actions';
import { ConnectorAction, ConnectorState } from 'generated-sources';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  useConnector,
  useUpdateConnectorState,
} from 'lib/hooks/api/kafkaConnect';
import { connector } from 'lib/fixtures/kafkaConnect';
import set from 'lodash/set';

const mockHistoryPush = jest.fn();
const deleteConnector = jest.fn();
const cancelMock = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockHistoryPush,
}));

jest.mock('lib/hooks/api/kafkaConnect', () => ({
  useConnector: jest.fn(),
  useDeleteConnector: jest.fn(),
  useUpdateConnectorState: jest.fn(),
}));

const expectActionButtonsExists = () => {
  expect(screen.getByText('Restart Connector')).toBeInTheDocument();
  expect(screen.getByText('Restart All Tasks')).toBeInTheDocument();
  expect(screen.getByText('Restart Failed Tasks')).toBeInTheDocument();
  expect(screen.getByText('Delete')).toBeInTheDocument();
};
const afterClickDropDownButton = () => {
  const dropDownButton = screen.getAllByRole('button');
  expect(dropDownButton.length).toEqual(1);
  userEvent.click(dropDownButton[0]);
};
describe('Actions', () => {
  afterEach(() => {
    mockHistoryPush.mockClear();
    deleteConnector.mockClear();
    cancelMock.mockClear();
  });

  describe('view', () => {
    const route = clusterConnectConnectorPath();
    const path = clusterConnectConnectorPath(
      'myCluster',
      'myConnect',
      'myConnector'
    );

    const renderComponent = () =>
      render(
        <WithRoute path={route}>
          <Actions />
        </WithRoute>,
        { initialEntries: [path] }
      );

    it('renders buttons when paused', () => {
      (useConnector as jest.Mock).mockImplementation(() => ({
        data: set({ ...connector }, 'status.state', ConnectorState.PAUSED),
      }));
      renderComponent();
      afterClickDropDownButton();
      expect(screen.getAllByRole('menuitem').length).toEqual(5);
      expect(screen.getByText('Resume')).toBeInTheDocument();
      expect(screen.queryByText('Pause')).not.toBeInTheDocument();
      expectActionButtonsExists();
    });

    it('renders buttons when failed', () => {
      (useConnector as jest.Mock).mockImplementation(() => ({
        data: set({ ...connector }, 'status.state', ConnectorState.FAILED),
      }));
      renderComponent();
      afterClickDropDownButton();
      expect(screen.getAllByRole('menuitem').length).toEqual(4);
      expect(screen.queryByText('Resume')).not.toBeInTheDocument();
      expect(screen.queryByText('Pause')).not.toBeInTheDocument();
      expectActionButtonsExists();
    });

    it('renders buttons when unassigned', () => {
      (useConnector as jest.Mock).mockImplementation(() => ({
        data: set({ ...connector }, 'status.state', ConnectorState.UNASSIGNED),
      }));
      renderComponent();
      afterClickDropDownButton();
      expect(screen.getAllByRole('menuitem').length).toEqual(4);
      expect(screen.queryByText('Resume')).not.toBeInTheDocument();
      expect(screen.queryByText('Pause')).not.toBeInTheDocument();
      expectActionButtonsExists();
    });

    it('renders buttons when running connector action', () => {
      (useConnector as jest.Mock).mockImplementation(() => ({
        data: set({ ...connector }, 'status.state', ConnectorState.RUNNING),
      }));
      renderComponent();
      afterClickDropDownButton();
      expect(screen.getAllByRole('menuitem').length).toEqual(5);
      expect(screen.queryByText('Resume')).not.toBeInTheDocument();
      expect(screen.getByText('Pause')).toBeInTheDocument();
      expectActionButtonsExists();
    });

    describe('mutations', () => {
      beforeEach(() => {
        (useConnector as jest.Mock).mockImplementation(() => ({
          data: set({ ...connector }, 'status.state', ConnectorState.RUNNING),
        }));
      });

      it('opens confirmation modal when delete button clicked', async () => {
        renderComponent();
        afterClickDropDownButton();
        await waitFor(() =>
          userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
        );
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      it('calls restartConnector when restart button clicked', () => {
        const restartConnector = jest.fn();
        (useUpdateConnectorState as jest.Mock).mockImplementation(() => ({
          mutateAsync: restartConnector,
        }));
        renderComponent();
        afterClickDropDownButton();
        userEvent.click(
          screen.getByRole('menuitem', { name: 'Restart Connector' })
        );
        expect(restartConnector).toHaveBeenCalledWith(ConnectorAction.RESTART);
      });

      it('calls restartAllTasks', () => {
        const restartAllTasks = jest.fn();
        (useUpdateConnectorState as jest.Mock).mockImplementation(() => ({
          mutateAsync: restartAllTasks,
        }));
        renderComponent();
        afterClickDropDownButton();
        userEvent.click(
          screen.getByRole('menuitem', { name: 'Restart All Tasks' })
        );
        expect(restartAllTasks).toHaveBeenCalledWith(
          ConnectorAction.RESTART_ALL_TASKS
        );
      });

      it('calls restartFailedTasks', () => {
        const restartFailedTasks = jest.fn();
        (useUpdateConnectorState as jest.Mock).mockImplementation(() => ({
          mutateAsync: restartFailedTasks,
        }));
        renderComponent();
        afterClickDropDownButton();
        userEvent.click(
          screen.getByRole('menuitem', { name: 'Restart Failed Tasks' })
        );
        expect(restartFailedTasks).toHaveBeenCalledWith(
          ConnectorAction.RESTART_FAILED_TASKS
        );
      });

      it('calls pauseConnector when pause button clicked', () => {
        const pauseConnector = jest.fn();
        (useUpdateConnectorState as jest.Mock).mockImplementation(() => ({
          mutateAsync: pauseConnector,
        }));
        renderComponent();
        afterClickDropDownButton();
        userEvent.click(screen.getByRole('menuitem', { name: 'Pause' }));
        expect(pauseConnector).toHaveBeenCalledWith(ConnectorAction.PAUSE);
      });

      it('calls resumeConnector when resume button clicked', () => {
        const resumeConnector = jest.fn();
        (useConnector as jest.Mock).mockImplementation(() => ({
          data: set({ ...connector }, 'status.state', ConnectorState.PAUSED),
        }));
        (useUpdateConnectorState as jest.Mock).mockImplementation(() => ({
          mutateAsync: resumeConnector,
        }));
        renderComponent();
        afterClickDropDownButton();
        userEvent.click(screen.getByRole('menuitem', { name: 'Resume' }));
        expect(resumeConnector).toHaveBeenCalledWith(ConnectorAction.RESUME);
      });
    });
  });
});
