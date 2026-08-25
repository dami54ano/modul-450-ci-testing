/**
 * GameForm-Komponente
 *
 * Formular zum Erstellen und Bearbeiten eines Spiels.
 * Unterstützt den automatischen Import von Spieldetails über eine Steam-Namenssuche.
 * Wird mit `initialData` vorbelegt wenn ein Spiel bearbeitet wird.
 * Ruft `onSubmit` mit den eingegebenen Daten auf und `onCancel` beim Abbrechen.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Game } from '../../types/Game';
import { searchSteamGames, getSteamGameDetails, SteamSearchItem } from '../../api/steamApi';
import './GameForm.css';

interface Props {
  initialData?: Game | null;
  onSubmit: (game: Game) => void;
  onCancel: () => void;
}

const EMPTY_FORM: Game = {
  title: '',
  description: '',
  imageUrl: '',
  releaseDate: '',
};

/**
 * Wandelt ein Steam-Datumsformat (z. B. "23 Jun, 2014") in YYYY-MM-DD um.
 * Gibt einen leeren String zurück wenn das Datum ungültig ist.
 */
const parseSteamDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  return '';
};

const GameForm: React.FC<Props> = ({ initialData, onSubmit, onCancel }) => {
  const [form, setForm] = useState<Game>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof Game, string>>>({});
  const [steamSearch, setSteamSearch] = useState('');
  const [steamResults, setSteamResults] = useState<SteamSearchItem[]>([]);
  const [steamLoading, setSteamLoading] = useState(false);
  const [steamError, setSteamError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLUListElement>(null);
  const isEdit = !!initialData?.id;

  useEffect(() => {
    setForm(initialData ?? EMPTY_FORM);
    setErrors({});
    setSteamSearch('');
    setSteamResults([]);
    setSteamError(null);
  }, [initialData]);

  /** Klick ausserhalb der Trefferliste schliesst sie */
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        setSteamResults([]);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSteamSearch = async () => {
    if (!steamSearch.trim()) return;
    setSteamLoading(true);
    setSteamError(null);
    setSteamResults([]);
    try {
      const results = await searchSteamGames(steamSearch.trim());
      if (results.length === 0) {
        setSteamError('Kein Spiel gefunden.');
      } else {
        setSteamResults(results);
      }
    } catch {
      setSteamError('Fehler bei der Steam-Suche.');
    } finally {
      setSteamLoading(false);
    }
  };

  const handleSteamSelect = async (item: SteamSearchItem) => {
    setSteamResults([]);
    setSteamSearch('');
    setSteamLoading(true);
    setSteamError(null);
    try {
      const data = await getSteamGameDetails(String(item.id));
      if (!data) {
        setSteamError('Spieldetails konnten nicht geladen werden.');
        return;
      }
      setForm(prev => ({
        ...prev,
        title: data.name ?? prev.title,
        description: data.short_description ?? prev.description,
        imageUrl: data.header_image ?? prev.imageUrl,
        releaseDate: data.release_date?.date
          ? parseSteamDate(data.release_date.date)
          : prev.releaseDate,
      }));
      setErrors({});
    } catch {
      setSteamError('Fehler beim Laden der Spieldetails.');
    } finally {
      setSteamLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof Game, string>> = {};
    if (!form.title.trim()) newErrors.title = 'Title is required.';
    if (!form.releaseDate) newErrors.releaseDate = 'Release date is required.';
    else if (new Date(form.releaseDate) > new Date())
      newErrors.releaseDate = 'Date cannot be in the future.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  return (
    <div
      className="game-form__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-form-title"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <form className="game-form" onSubmit={handleSubmit} noValidate>

        {/* Header */}
        <div className="game-form__header">
          <h2 id="game-form-title" className="game-form__title">
            {isEdit ? 'Edit Game' : 'Add New Game'}
          </h2>
          <button
            type="button"
            className="game-form__close"
            onClick={onCancel}
            aria-label="Formular schliessen"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Steam Import */}
        <div className="game-form__steam">
          <label className="game-form__steam-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Import from Steam
          </label>
          <div className="game-form__steam-row">
            <input
              type="text"
              value={steamSearch}
              onChange={(e) => { setSteamSearch(e.target.value); setSteamResults([]); setSteamError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSteamSearch(); } }}
              className="game-form__input game-form__steam-input"
              placeholder="Spielname suchen (z. B. Witcher)"
              disabled={steamLoading}
            />
            <button
              type="button"
              className="game-form__btn game-form__btn--steam"
              onClick={handleSteamSearch}
              disabled={steamLoading || !steamSearch.trim()}
            >
              {steamLoading ? (
                <span className="game-form__steam-spinner" />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              )}
              {steamLoading ? 'Loading…' : 'Search'}
            </button>
          </div>

          {/* Trefferliste */}
          {steamResults.length > 0 && (
            <ul className="game-form__steam-results" ref={resultsRef}>
              {steamResults.map(item => (
                <li
                  key={item.id}
                  className="game-form__steam-result"
                  onClick={() => handleSteamSelect(item)}
                >
                  {item.tiny_image && (
                    <img
                      src={item.tiny_image}
                      alt={item.name}
                      className="game-form__steam-result-img"
                    />
                  )}
                  <span className="game-form__steam-result-name">{item.name}</span>
                  <span className="game-form__steam-result-id">#{item.id}</span>
                </li>
              ))}
            </ul>
          )}

          {steamError && (
            <span className="game-form__error">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {steamError}
            </span>
          )}
          <div className="game-form__steam-divider"><span>or enter manually</span></div>
        </div>

        {/* Title */}
        <label className="game-form__label">
          Title <span className="game-form__required">*</span>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className={`game-form__input ${errors.title ? 'game-form__input--error' : ''}`}
            placeholder="e.g. The Witcher 3: Wild Hunt"
          />
          {errors.title && (
            <span className="game-form__error">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {errors.title}
            </span>
          )}
        </label>

        {/* Description */}
        <label className="game-form__label">
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="game-form__input game-form__textarea"
            placeholder="Short description of the game..."
            rows={3}
          />
        </label>

        {/* Image URL */}
        <label className="game-form__label">
          Image URL
          <input
            name="imageUrl"
            value={form.imageUrl}
            onChange={handleChange}
            className="game-form__input"
            placeholder="https://example.com/cover.jpg"
          />
        </label>

        {/* Release Date */}
        <label className="game-form__label">
          Release Date <span className="game-form__required">*</span>
          <input
            type="date"
            name="releaseDate"
            value={form.releaseDate}
            onChange={handleChange}
            className={`game-form__input ${errors.releaseDate ? 'game-form__input--error' : ''}`}
            max={new Date().toISOString().split('T')[0]}
          />
          {errors.releaseDate && (
            <span className="game-form__error">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {errors.releaseDate}
            </span>
          )}
        </label>

        {/* Actions */}
        <div className="game-form__actions">
          <button type="button" className="game-form__btn game-form__btn--cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="game-form__btn game-form__btn--submit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {isEdit ? 'Save Changes' : 'Create Game'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GameForm;
