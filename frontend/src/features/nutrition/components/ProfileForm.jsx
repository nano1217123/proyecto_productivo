import { useState } from "react";
import { nutritionApi } from "../api/nutritionApi";
import { allergens, goals } from "./labels";

export default function ProfileForm({ profile, saved, close }) {
  const [selected, setSelected] = useState(profile.settings?.goal ?? "mantener");
  const [changeWeight, setChangeWeight] = useState(profile.weight == null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const settings = profile.settings;
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await nutritionApi.profile({
        birthYear: Number(form.get("birthYear")),
        ...(changeWeight ? { weight: Number(form.get("weight")) } : {}),
        goal: selected,
        activity: form.get("activity"),
        preference: form.get("preference"),
        allergens: form.getAll("allergens"),
        needsProfessional: form.has("needsProfessional"),
        tracking: form.has("tracking"),
        zone: settings?.zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/Bogota",
      });
      saved("Configuración guardada.");
    } catch (error) { setError(error.message); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="nut-panel nut-stack">
    <h2>{settings ? "Configuración nutricional" : "Configura tu perfil nutricional"}</h2>
    <fieldset><legend>Objetivo nutricional</legend>
      <div className="nut-goals">{Object.entries(goals).map(([key, goal]) => <label key={key} className="nut-goal">
        <input type="radio" name="goal" checked={selected === key} onChange={() => setSelected(key)} />
        <strong><span aria-hidden="true">{goal.icon} </span>{goal.name}</strong><small>{goal.description}</small>
      </label>)}</div>
    </fieldset>
    <div className="nut-fields">
      <label>Año de nacimiento<input name="birthYear" type="number" min="1900" max={profile.today.slice(0, 4)} required defaultValue={settings?.birthYear} /></label>
      {changeWeight ? <label>Peso actual (kg)<input name="weight" type="number" min="20" max="300" step=".01" required defaultValue={profile.weight} /></label> :
        <div><strong>Peso de Mi progreso</strong><p>{profile.weight} kg <button type="button" onClick={() => setChangeWeight(true)}>Actualizar peso</button></p></div>}
      <label>Actividad física<select name="activity" defaultValue={settings?.activity ?? ""} required>
        <option value="" disabled>Selecciona</option><option value="ocasional">Sin entrenamiento regular</option><option value="regular">Entreno regularmente</option>
      </select></label>
      <label>Preferencia alimentaria<select name="preference" defaultValue={settings?.preference ?? "todos"}>
        <option value="todos">Sin preferencia</option><option value="vegetariana">Vegetariana</option><option value="vegana">Vegana</option>
      </select></label>
    </div>
    <fieldset><legend>Alergias o intolerancias conocidas</legend><div className="nut-actions">{allergens.map((name) =>
      <label key={name}><input name="allergens" type="checkbox" value={name} defaultChecked={settings?.allergens.includes(name)} /> {name}</label>)}</div>
    </fieldset>
    <label><input name="needsProfessional" type="checkbox" defaultChecked={settings?.needsProfessional} /> Tengo una condición que puede cambiar mis necesidades nutricionales, o estoy en embarazo o lactancia.</label>
    <label><input name="tracking" type="checkbox" defaultChecked={settings?.tracking ?? true} /> Habilitar el registro de alimentos</label>
    {error && <p role="alert">{error}</p>}
    <div className="nut-actions"><button className="nut-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar configuración"}</button>
      {settings && <button type="button" onClick={close}>Cancelar</button>}</div>
  </form>;
}
