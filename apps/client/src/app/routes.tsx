import type { ReactElement } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../auth/LoginPage';
import { CharacterListPage } from '../characters/CharacterListPage';
import { CharacterCreatePage } from '../characters/CharacterCreatePage';
import { GamePage } from '../game/GamePage';

export function AppRoutes(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/characters" element={<CharacterListPage />} />
      <Route path="/characters/new" element={<CharacterCreatePage />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
