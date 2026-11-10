import { useEffect, useState } from 'react';
import './App.css';

const API = import.meta.env.VITE_API_BASE_URL || '/api';
const types = ['맨몸', '머신', '덤벨', '바벨'];
const parts = ['가슴', '등', '어깨', '하체', '팔', '복근', '기타'];

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('백엔드 연결 실패: FastAPI 실행 및 CORS 설정을 확인하세요.');
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : `오류: ${response.status}`);
  }
  return data;
}

function App() {
  const [exercises, setExercises] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [workouts, setWorkouts] = useState([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('바벨');
  const [part, setPart] = useState('가슴');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  });
  const [sets, setSets] = useState([{ weight: '', reps: '' }]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = exercises.find(item => String(item.id) === selectedId);

  async function loadExercises(preferredId) {
    const data = await api('/exercises');
    setExercises(data);
    setSelectedId(current => {
      const next = preferredId == null ? current : String(preferredId);
      return data.some(item => String(item.id) === next) ? next : String(data[0]?.id ?? '');
    });
  }

  useEffect(() => {
    loadExercises().catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setWorkouts([]);
      return;
    }
    let cancelled = false;
    api(`/workouts?exercise_id=${selectedId}`)
      .then(data => { if (!cancelled) setWorkouts(data); })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [selectedId]);

  async function createExercise(event) {
    event.preventDefault();
    setError(''); setMessage(''); setBusy(true);
    try {
      const created = await api('/exercises', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), type, part }),
      });
      await loadExercises(created.id);
      setName('');
      setMessage('운동이 등록되었습니다.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function deleteExercise() {
    if (!selected || !window.confirm(`${selected.name} 운동을 삭제할까요?`)) return;
    setError(''); setMessage(''); setBusy(true);
    try {
      await api(`/exercises/${selectedId}`, { method: 'DELETE' });
      await loadExercises();
      setMessage('운동이 삭제되었습니다.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function changeSet(index, key, value) {
    setSets(old => old.map((set, i) => i === index ? { ...set, [key]: value } : set));
  }

  async function saveWorkout(event) {
    event.preventDefault();
    if (!selected) return;
    setError(''); setMessage('');
    if (sets.some(s => s.weight === '' || s.reps === '' || Number(s.weight) < 0 || !Number.isInteger(Number(s.reps)) || Number(s.reps) < 1)) {
      setError('무게는 0 이상, 횟수는 1 이상의 정수여야 합니다.');
      return;
    }
    setBusy(true);
    try {
      await api('/workouts', {
        method: 'POST',
        body: JSON.stringify({
          exercise_id: selected.id,
          date,
          sets: sets.map(s => ({ weight: Number(s.weight), reps: Number(s.reps) })),
        }),
      });
      setWorkouts(await api(`/workouts?exercise_id=${selectedId}`));
      setSets([{ weight: '', reps: '' }]);
      setMessage('기록이 저장되었습니다.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <main>
      <h1>WeightLog</h1>
      <p>운동 등록 및 세트별 기록</p>

      {error && <p role="alert">오류: {error}</p>}
      {message && <p role="status">{message}</p>}

      <hr />
      <h2>1. 운동 등록</h2>
      <form onSubmit={createExercise}>
        <p><label>운동명: <input value={name} onChange={e => setName(e.target.value)} maxLength={30} required /></label></p>
        <p><label>운동 종류: <select value={type} onChange={e => setType(e.target.value)}>
          {types.map(item => <option key={item} value={item}>{item}</option>)}
        </select></label></p>
        <p><label>운동 부위: <select value={part} onChange={e => setPart(e.target.value)}>
          {parts.map(item => <option key={item} value={item}>{item}</option>)}
        </select></label></p>
        <button type="submit" disabled={busy}>운동 등록</button>
      </form>

      <hr />
      <h2>2. 운동 목록</h2>
      {exercises.length === 0 ? <p>등록된 운동이 없습니다.</p> : (
        <ul>
          {exercises.map(ex => <li key={ex.id}>
            <button type="button" onClick={() => setSelectedId(String(ex.id))}>
              {ex.name} ({ex.type}, {ex.part})
            </button>
            {selectedId === String(ex.id) ? ' ← 선택됨' : ''}
          </li>)}
        </ul>
      )}

      {selected && <>
        <p>선택한 운동: <strong>{selected.name}</strong></p>
        <button type="button" disabled={busy} onClick={deleteExercise}>선택한 운동 삭제</button>
        <hr />
        <h2>3. 운동 기록 작성</h2>
        <form onSubmit={saveWorkout}>
          <p><label>운동 날짜: <input type="date" value={date} onChange={e => setDate(e.target.value)} required /></label></p>
          {sets.map((set, index) => <p key={index}>
            {index + 1}세트{' '}
            <label>무게(kg): <input type="number" min="0" step="any" value={set.weight} onChange={e => changeSet(index, 'weight', e.target.value)} required /></label>{' '}
            <label>횟수: <input type="number" min="1" step="1" value={set.reps} onChange={e => changeSet(index, 'reps', e.target.value)} required /></label>{' '}
            <button type="button" disabled={sets.length === 1} onClick={() => setSets(old => old.filter((_, i) => i !== index))}>세트 제거</button>
          </p>)}
          <button type="button" onClick={() => setSets(old => [...old, { weight: '', reps: '' }])}>세트 추가</button>{' '}
          <button type="submit" disabled={busy}>기록 저장</button>
        </form>

        <hr />
        <h2>4. 지난 기록</h2>
        {workouts.length === 0 ? <p>기록이 없습니다.</p> : (
          <ul>
            {[...workouts].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).map(workout => <li key={workout.id}>
              <strong>{workout.date}</strong>
              <ul>{workout.sets.map((set, index) => <li key={index}>{index + 1}세트: {set.weight}kg × {set.reps}회</li>)}</ul>
            </li>)}
          </ul>
        )}
      </>}
      <p>※ 재시작시 데이터 초기화</p>
    </main>
  );
}

export default App;
