// @ts-nocheck
import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from './Dashboard';
import {loadModel} from './data.mjs';
import './dashboard.css';
loadModel().then(initial=>createRoot(document.getElementById('root')).render(<Home initial={initial}/>)).catch(error=>{const root=document.getElementById('root');root.textContent='数据读取失败，刷新页面重试。'+error.message;});
