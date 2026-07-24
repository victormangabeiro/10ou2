import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

interface User {
  id: string;
  email: string;
  name: string;
}

interface Attendance {
  id: string;
  name: string;
  role: 'LINE' | 'GOALKEEPER';
  status: 'PRE_LIST' | 'PRESENT' | 'CANCELED' | 'CUT';
  paid: boolean;
  teamId: string | null;
}

interface Team {
  id: string;
  name: string;
  color: string;
  orderIndex: number;
  status: 'BENCH' | 'PLAYING' | 'WAITING';
  players: Attendance[];
}

interface Goal {
  id: string;
  matchId: string;
  teamId: string;
  scorerId: string;
  assistantId: string | null;
  scorer: Attendance;
  assistant?: Attendance | null;
}

interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  status: 'PENDING' | 'PLAYING' | 'FINISHED';
  durationSeconds: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  homeTeam: Team;
  awayTeam: Team;
  goals: Goal[];
}

interface EventState {
  eventId: string;
  name: string;
  status: 'DRAFT' | 'PRE_LIST' | 'ACTIVE' | 'FINISHED';
  pixKey: string | null;
  pixValue: number | null;
  configs: {
    playersPerTeam: number;
    useGoalkeepers: boolean;
    matchTimeMinutes: number;
    matchGolLimit: number;
    drawRule: string;
  };
  playingTeams: Team[];
  waitingQueue: Team[];
  activeMatch: Match | null;
  benchPlayers: Attendance[];
  attendances: Attendance[];
  recentMatches: Match[];
}

interface LeaderboardEntry {
  id: string;
  name: string;
  goals?: number;
  assists?: number;
  wins?: number;
  matchesPlayed?: number;
}

interface StatsState {
  totalMatches: number;
  totalGoals: number;
  leaderboards: {
    scorers: LeaderboardEntry[];
    assistants: LeaderboardEntry[];
    wins: LeaderboardEntry[];
  };
}

interface AppStore {
  // Auth
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;

  // Navigation / UI
  currentView: 'LOGIN' | 'REGISTER' | 'DASHBOARD' | 'PELADA_DETAIL' | 'EVENT_ADMIN' | 'EVENT_PUBLIC';
  currentPeladaId: string | null;
  currentEventId: string | null;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;

  // Data
  peladas: any[];
  events: any[];
  activeEventState: EventState | null;
  activeEventStats: StatsState | null;

  // Real-time Timer State (Synced via WebSockets or updated locally)
  elapsedSeconds: number;
  isTimerPaused: boolean;

  // Socket
  socket: Socket | null;

  // Actions - Auth
  setToken: (token: string | null) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  registerUser: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  checkMe: () => Promise<void>;
  updateProfile: (name?: string, currentPassword?: string, newPassword?: string) => Promise<boolean>;

  // Actions - Navigation
  navigate: (view: AppStore['currentView'], params?: { peladaId?: string; eventId?: string }) => void;

  // Actions - Pelada
  fetchPeladas: () => Promise<void>;
  createPelada: (data: any) => Promise<void>;
  updatePelada: (id: string, data: any) => Promise<void>;
  deletePelada: (id: string) => Promise<void>;

  // Actions - Events
  fetchEvents: (peladaId: string) => Promise<void>;
  createEvent: (data: any) => Promise<void>;
  updateEventStatus: (id: string, status: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  // Actions - Attendance / Public List
  signUpPublic: (eventId: string, name: string, role: 'LINE' | 'GOALKEEPER') => Promise<void>;
  adminAddPlayer: (name: string, role: 'LINE' | 'GOALKEEPER', status?: string) => Promise<void>;
  adminUpdateAttendance: (id: string, data: Partial<Attendance>) => Promise<void>;
  adminRemoveAttendance: (id: string) => Promise<void>;

  // Actions - Matches / Game Engine
  fetchEventState: (eventId: string) => Promise<void>;
  fetchEventStats: (eventId: string) => Promise<void>;
  generateTeams: (method: 'ARRIVAL_ORDER' | 'RANDOM') => Promise<void>;
  startMatch: () => Promise<void>;
  recordGoal: (teamId: string, scorerId: string, assistantId?: string) => Promise<void>;
  endMatch: (drawWinnerTeamId?: string) => Promise<void>;

  // WebSocket Connection
  connectSocket: (eventId: string) => void;
  disconnectSocket: () => void;
  sendTimerUpdate: (elapsedSeconds: number, isPaused: boolean) => void;
}

export const useStore = create<AppStore>((set, get) => {
  // Helper for fetch options
  const getHeaders = () => {
    const token = get().token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  return {
    // Auth initial state
    token: localStorage.getItem('token'),
    user: null,
    isAuthenticated: false,
    authLoading: true,

    // UI initial state
    currentView: 'LOGIN',
    currentPeladaId: null,
    currentEventId: null,
    toast: null,

    // Data initial state
    peladas: [],
    events: [],
    activeEventState: null,
    activeEventStats: null,

    // Timer
    elapsedSeconds: 0,
    isTimerPaused: true,

    // Socket
    socket: null,

    // Toast actions
    showToast: (message, type = 'info') => {
      set({ toast: { message, type } });
      setTimeout(() => get().hideToast(), 4000);
    },
    hideToast: () => set({ toast: null }),

    setToken: (token) => {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
      set({ token, isAuthenticated: !!token });
    },

    // Auth actions
    login: async (email, password) => {
      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Erro ao fazer login');
        }
        get().setToken(data.token);
        set({ user: data.user, isAuthenticated: true });
        get().showToast('Bem-vindo de volta!', 'success');
        get().navigate('DASHBOARD');
        return true;
      } catch (error: any) {
        get().showToast(error.message || 'Falha no login', 'error');
        return false;
      }
    },

    registerUser: async (email, password, name) => {
      try {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Erro ao registrar');
        }
        get().setToken(data.token);
        set({ user: data.user, isAuthenticated: true });
        get().showToast('Conta criada com sucesso!', 'success');
        get().navigate('DASHBOARD');
        return true;
      } catch (error: any) {
        get().showToast(error.message || 'Falha no cadastro', 'error');
        return false;
      }
    },

    logout: () => {
      get().setToken(null);
      get().disconnectSocket();
      set({ user: null, isAuthenticated: false, currentView: 'LOGIN', activeEventState: null });
      get().showToast('Logout realizado.', 'info');
    },

    checkMe: async () => {
      const token = get().token;
      if (!token) {
        set({ authLoading: false });
        return;
      }
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: getHeaders(),
        });
        if (!response.ok) {
          throw new Error('Token expirado');
        }
        const user = await response.json();
        set({ user, isAuthenticated: true, authLoading: false });
        
        // Se estiver autenticado e na tela de login/cadastro, redireciona para o Dashboard
        const currentView = get().currentView;
        if (currentView === 'LOGIN' || currentView === 'REGISTER') {
          get().navigate('DASHBOARD');
        }
      } catch (e) {
        get().setToken(null);
        set({ authLoading: false });
      }
    },

    updateProfile: async (name, currentPassword, newPassword) => {
      try {
        const response = await fetch(`${API_URL}/auth/profile`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({ name, currentPassword, newPassword }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Erro ao atualizar perfil');
        }
        set({ user: data });
        get().showToast('Perfil atualizado com sucesso!', 'success');
        return true;
      } catch (error: any) {
        get().showToast(error.message || 'Falha ao atualizar perfil', 'error');
        return false;
      }
    },

    // Navigation
    navigate: (view, params = {}) => {
      const { peladaId = null, eventId = null } = params;
      
      // Cleanup WebSockets if leaving a game
      if (get().currentView === 'EVENT_ADMIN' || get().currentView === 'EVENT_PUBLIC') {
        if (eventId !== get().currentEventId) {
          get().disconnectSocket();
        }
      }

      set({
        currentView: view,
        currentPeladaId: peladaId || get().currentPeladaId,
        currentEventId: eventId || get().currentEventId,
      });

      // Fetch corresponding state on view load
      if (view === 'DASHBOARD') {
        get().fetchPeladas();
      } else if (view === 'PELADA_DETAIL' && peladaId) {
        get().fetchEvents(peladaId);
      } else if (view === 'EVENT_ADMIN' && eventId) {
        get().fetchEventState(eventId);
        get().fetchEventStats(eventId);
        get().connectSocket(eventId);
      } else if (view === 'EVENT_PUBLIC' && eventId) {
        get().fetchEventState(eventId);
        get().fetchEventStats(eventId);
        get().connectSocket(eventId);
      }
    },

    // Pelada CRUD
    fetchPeladas: async () => {
      try {
        const response = await fetch(`${API_URL}/pelada`, { headers: getHeaders() });
        if (response.ok) {
          const peladas = await response.json();
          set({ peladas });
        }
      } catch (e) {}
    },

    createPelada: async (data) => {
      try {
        const response = await fetch(`${API_URL}/pelada`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (response.ok) {
          get().showToast('Pelada criada com sucesso!', 'success');
          get().fetchPeladas();
        } else {
          const err = await response.json();
          throw new Error(err.message || 'Erro ao criar pelada');
        }
      } catch (error: any) {
        get().showToast(error.message, 'error');
      }
    },

    updatePelada: async (id, data) => {
      try {
        const response = await fetch(`${API_URL}/pelada/${id}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (response.ok) {
          get().showToast('Configurações salvas.', 'success');
          get().fetchPeladas();
        }
      } catch (e) {}
    },

    deletePelada: async (id) => {
      try {
        const response = await fetch(`${API_URL}/pelada/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (response.ok) {
          get().showToast('Pelada excluída.', 'info');
          get().navigate('DASHBOARD');
        }
      } catch (e) {}
    },

    // Events CRUD
    fetchEvents: async (peladaId) => {
      try {
        const response = await fetch(`${API_URL}/event/pelada/${peladaId}`, { headers: getHeaders() });
        if (response.ok) {
          const events = await response.json();
          set({ events });
        }
      } catch (e) {}
    },

    createEvent: async (data) => {
      try {
        const response = await fetch(`${API_URL}/event`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (response.ok) {
          get().showToast('Dia de jogo criado!', 'success');
          get().fetchEvents(data.peladaId);
        }
      } catch (e) {}
    },

    updateEventStatus: async (id, status) => {
      try {
        const response = await fetch(`${API_URL}/event/${id}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({ status }),
        });
        if (response.ok) {
          get().showToast(`Status alterado para ${status}.`, 'info');
          // If we finish the event, stop socket updates
          if (status === 'FINISHED') {
            get().disconnectSocket();
          }
          get().fetchEventState(id);
        }
      } catch (e) {}
    },

    deleteEvent: async (id) => {
      try {
        const response = await fetch(`${API_URL}/event/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (response.ok) {
          get().showToast('Dia de jogo removido.', 'info');
          if (get().currentPeladaId) {
            get().navigate('PELADA_DETAIL', { peladaId: get().currentPeladaId! });
          }
        }
      } catch (e) {}
    },

    // Public / Admin Attendance Actions
    signUpPublic: async (eventId, name, role) => {
      try {
        const response = await fetch(`${API_URL}/attendance/public`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, name, role }),
        });
        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.message || 'Erro ao entrar na lista');
        }
        get().showToast('Você entrou na pré-lista!', 'success');
        get().fetchEventState(eventId);
      } catch (error: any) {
        get().showToast(error.message, 'error');
      }
    },

    adminAddPlayer: async (name, role, status = 'PRESENT') => {
      const eventId = get().currentEventId;
      if (!eventId) return;
      try {
        const response = await fetch(`${API_URL}/attendance`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ eventId, name, role, status }),
        });
        if (response.ok) {
          get().showToast('Jogador adicionado.', 'success');
          get().fetchEventState(eventId);
        } else {
          const err = await response.json();
          throw new Error(err.message || 'Erro ao adicionar jogador');
        }
      } catch (error: any) {
        get().showToast(error.message, 'error');
      }
    },

    adminUpdateAttendance: async (id, data) => {
      try {
        const response = await fetch(`${API_URL}/attendance/${id}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (response.ok) {
          get().showToast('Presença atualizada.', 'info');
          const eventId = get().currentEventId;
          if (eventId) get().fetchEventState(eventId);
        }
      } catch (e) {}
    },

    adminRemoveAttendance: async (id) => {
      try {
        const response = await fetch(`${API_URL}/attendance/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (response.ok) {
          get().showToast('Jogador removido do evento.', 'info');
          const eventId = get().currentEventId;
          if (eventId) get().fetchEventState(eventId);
        }
      } catch (e) {}
    },

    // Game Engine API integration
    fetchEventState: async (eventId) => {
      try {
        // State route works for both public and admins
        const response = await fetch(`${API_URL}/match/state/${eventId}`);
        if (response.ok) {
          const activeEventState = await response.json();
          set({ activeEventState });
          if (activeEventState.activeMatch) {
            set({
              elapsedSeconds: activeEventState.activeMatch.durationSeconds || 0,
            });
          }
        }
      } catch (e) {}
    },

    fetchEventStats: async (eventId) => {
      try {
        const response = await fetch(`${API_URL}/match/stats/${eventId}`);
        if (response.ok) {
          const activeEventStats = await response.json();
          set({ activeEventStats });
        }
      } catch (e) {}
    },

    generateTeams: async (method) => {
      const eventId = get().currentEventId;
      if (!eventId) return;
      try {
        const response = await fetch(`${API_URL}/match/generate-teams`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ eventId, method }),
        });
        if (response.ok) {
          const state = await response.json();
          set({ activeEventState: state });
          get().showToast('Times gerados com sucesso!', 'success');
        } else {
          const err = await response.json();
          throw new Error(err.message);
        }
      } catch (error: any) {
        get().showToast(error.message, 'error');
      }
    },

    startMatch: async () => {
      const eventId = get().currentEventId;
      if (!eventId) return;
      try {
        const response = await fetch(`${API_URL}/match/start`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ eventId }),
        });
        if (response.ok) {
          const state = await response.json();
          set({ activeEventState: state, elapsedSeconds: 0, isTimerPaused: false });
          get().showToast('Partida iniciada!', 'success');
        } else {
          const err = await response.json();
          throw new Error(err.message);
        }
      } catch (error: any) {
        get().showToast(error.message, 'error');
      }
    },

    recordGoal: async (teamId, scorerId, assistantId) => {
      const state = get().activeEventState;
      const matchId = state?.activeMatch?.id;
      if (!matchId || !state) return;
      try {
        const response = await fetch(`${API_URL}/match/goal`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ matchId, teamId, scorerId, assistantId }),
        });
        if (response.ok) {
          const state = await response.json();
          set({ activeEventState: state });
          get().showToast('Gol registrado!', 'success');
          get().fetchEventStats(state.eventId); // Refresh leaderboards
        }
      } catch (e) {}
    },

    endMatch: async (drawWinnerTeamId) => {
      const state = get().activeEventState;
      const matchId = state?.activeMatch?.id;
      if (!matchId || !state) return;
      try {
        const response = await fetch(`${API_URL}/match/end`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ matchId, drawWinnerTeamId }),
        });
        if (response.ok) {
          const state = await response.json();
          set({ activeEventState: state, isTimerPaused: true });
          get().showToast('Partida encerrada.', 'info');
          get().fetchEventStats(state.eventId); // Refresh leaderboards
        }
      } catch (e) {}
    },

    // WebSockets Connect & Sync
    connectSocket: (eventId) => {
      get().disconnectSocket();

      const socket = io(API_URL);

      socket.on('connect', () => {
        socket.emit('joinEvent', { eventId });
      });

      // Receive state updates (goals, end match, etc.)
      socket.on('stateUpdated', (state) => {
        set({ activeEventState: state });
      });

      // Receive real-time timer ticks from the admin
      socket.on('timerTicked', (data: { elapsedSeconds: number; isPaused: boolean }) => {
        set({
          elapsedSeconds: data.elapsedSeconds,
          isTimerPaused: data.isPaused,
        });
      });

      set({ socket });
    },

    disconnectSocket: () => {
      const { socket, currentEventId } = get();
      if (socket) {
        if (currentEventId) {
          socket.emit('leaveEvent', { eventId: currentEventId });
        }
        socket.disconnect();
        set({ socket: null });
      }
    },

    sendTimerUpdate: (elapsedSeconds, isPaused) => {
      const { socket, currentEventId } = get();
      if (socket && currentEventId) {
        socket.emit('timerUpdate', { eventId: currentEventId, elapsedSeconds, isPaused });
        set({ elapsedSeconds, isTimerPaused: isPaused });
      }
    },
  };
});
