import { useState, useEffect } from 'react';
import { Users, UserPlus, X, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { employeeApi, productionApi } from '../../../services/productionService';

export default function AdminDashboard() {
  // Roster state
  const [employees, setEmployees] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add-employee modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Loads roster + batches without touching state (callers apply the result),
  // so the mount effect can defer setState into promise callbacks.
  // Batch counts come from the employees already embedded in each batch,
  // so no extra endpoint is needed.
  const fetchAdminData = async () => {
    const [employeeData, batchData] = await Promise.all([
      employeeApi.getAllEmployees(),
      productionApi.getAllBatches()
    ]);
    return {
      employees: Array.isArray(employeeData) ? employeeData : [],
      batches: Array.isArray(batchData?.items) ? batchData.items : []
    };
  };

  useEffect(() => {
    fetchAdminData()
      .then((data) => {
        setEmployees(data.employees);
        setBatches(data.batches);
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.error || err.message || 'Error al cargar los datos de administración.');
      })
      .finally(() => setLoading(false));
  }, []);

  // Batches worked on, per employee id
  const batchCountByEmployee = batches.reduce((acc, batch) => {
    (batch.employees || []).forEach((emp) => {
      acc[emp.id] = (acc[emp.id] || 0) + 1;
    });
    return acc;
  }, {});

  const openAddModal = () => {
    setNewEmployeeName('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeAddModal = () => {
    setIsModalOpen(false);
    setFormError(null);
    setNewEmployeeName('');
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployeeName.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const created = await employeeApi.createEmployee(newEmployeeName.trim());
      closeAddModal();
      setFeedback({ type: 'success', message: `"${created.name}" agregado a la nómina.` });
      setEmployees((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Error al guardar el empleado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminData();
      setEmployees(data.employees);
      setBatches(data.batches);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al cargar los datos de administración.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consola de administración</h1>
          <p className="text-sm text-slate-500 font-medium">Administra la nómina de empleados y los registros del sistema</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors text-sm"
        >
          <UserPlus className="h-5 w-5" /> Agregar empleado
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm border ${
          feedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {feedback.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Empleados en la nómina</p>
            <h3 className="text-2xl font-bold text-slate-900">{employees.length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Lotes de producción registrados</p>
            <h3 className="text-2xl font-bold text-slate-900">{batches.length}</h3>
          </div>
        </div>
      </div>

      {/* Roster card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-slate-500 h-5 w-5" /> Nómina de empleados
          </h3>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="Actualizar nómina"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Cargando nómina...</div>
        ) : error ? (
          <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-sm border border-rose-200">{error}</div>
        ) : employees.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Aún no hay empleados. Utiliza <strong>Agregar empleado</strong> para crear el primero.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {employees.map((emp) => (
              <div key={emp.id} className="border border-slate-200 rounded-lg p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{emp.name}</p>
                  <p className="text-xs text-slate-500">
                    {batchCountByEmployee[emp.id] || 0} {(batchCountByEmployee[emp.id] || 0) === 1 ? 'lote trabajado' : 'lotes trabajados'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add employee modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="text-emerald-400 h-5 w-5" /> Agregar empleado
              </h3>
              <button
                onClick={closeAddModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  autoFocus
                  maxLength={100}
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  placeholder="Ejemplo: Carlos Gómez"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  El nombre debe ser único y se usa para asignar empleados a los lotes de producción.
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-lg flex items-center gap-2 text-sm bg-rose-50 text-rose-800 border border-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !newEmployeeName.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Guardando...' : 'Agregar a la nómina'}
                </button>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
