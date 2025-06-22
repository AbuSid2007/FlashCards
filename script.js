window.addEventListener('DOMContentLoaded', () => {
    const folderInput = document.getElementById('folderInput');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const imageInput = document.getElementById('imageInput');
    const bulkText = document.getElementById('bulkText');
    const extractBtn = document.getElementById('extractBtn');
    const generateBtn = document.getElementById('generateBtn');
    const foldersContainer = document.getElementById('foldersContainer');

    let cardsByFolder = JSON.parse(localStorage.getItem('cardsByFolder')) || {};
    let editModal = null;
    let folderFilters = {}; // Track which folders are showing only starred cards

    function saveData() {
        localStorage.setItem('cardsByFolder', JSON.stringify(cardsByFolder));
    }

    function uuid() {
        return 'xxxx-4xxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function createEditModal(card, folder) {
        // Remove existing modal if any
        if (editModal) {
            editModal.remove();
        }

        editModal = document.createElement('div');
        editModal.className = 'edit-panel';
        editModal.innerHTML = `
            <div class="edit-modal">
                <h3>Edit Flashcard</h3>
                <div class="form-group">
                    <label for="editQuestion">Question:</label>
                    <textarea id="editQuestion" placeholder="Enter your question...">${card.question}</textarea>
                </div>
                <div class="form-group">
                    <label for="editAnswer">Answer:</label>
                    <textarea id="editAnswer" placeholder="Enter your answer...">${card.answer}</textarea>
                </div>
                <div class="edit-actions">
                    <button class="btn-cancel">Cancel</button>
                    <button class="btn-save">Save Changes</button>
                </div>
            </div>
        `;

        document.body.appendChild(editModal);

        const questionTextarea = editModal.querySelector('#editQuestion');
        const answerTextarea = editModal.querySelector('#editAnswer');
        const cancelBtn = editModal.querySelector('.btn-cancel');
        const saveBtn = editModal.querySelector('.btn-save');

        // Focus on question textarea
        questionTextarea.focus();
        questionTextarea.setSelectionRange(questionTextarea.value.length, questionTextarea.value.length);

        cancelBtn.addEventListener('click', () => {
            editModal.remove();
            editModal = null;
        });

        saveBtn.addEventListener('click', () => {
            const newQuestion = questionTextarea.value.trim();
            const newAnswer = answerTextarea.value.trim();
            
            if (newQuestion && newAnswer) {
                card.question = newQuestion;
                card.answer = newAnswer;
                saveData();
                render();
                editModal.remove();
                editModal = null;
            } else {
                alert('Both question and answer are required!');
            }
        });

        // Close modal when clicking outside
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                editModal.remove();
                editModal = null;
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape' && editModal) {
                editModal.remove();
                editModal = null;
                document.removeEventListener('keydown', escapeHandler);
            }
        });
    }

    function createControls(card, folder) {
        const controls = document.createElement('div');
        controls.className = 'card-controls';

        const star = document.createElement('div');
        star.className = `card-star ${card.starred ? '' : 'inactive'}`;
        star.textContent = '★';
        star.addEventListener('click', e => {
            e.stopPropagation();
            card.starred = !card.starred;
            saveData();
            render();
        });

        const edit = document.createElement('button');
        edit.innerHTML = '✏️';
        edit.title = 'Edit';
        edit.addEventListener('click', e => {
            e.stopPropagation();
            createEditModal(card, folder);
        });

        const del = document.createElement('button');
        del.innerHTML = '🗑️';
        del.title = 'Delete';
        del.addEventListener('click', e => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this flashcard?')) {
                cardsByFolder[folder] = cardsByFolder[folder].filter(c => c.id !== card.id);
                saveData();
                render();
            }
        });

        controls.append(edit, del);
        return { controls, star };
    }

    function createCardElement(card, folder) {
        const wrapper = document.createElement('div');
        wrapper.className = 'flashcard';
        wrapper.dataset.id = card.id;

        const inner = document.createElement('div');
        inner.className = 'card-inner';

        const front = document.createElement('div');
        front.className = 'card-front';
        const frontContent = document.createElement('div');
        frontContent.innerHTML = `<h3>Question</h3><div style="flex-grow: 1; display: flex; align-items: center; font-size: 1.1rem; font-weight: 500;">${card.question}</div>`;
        front.appendChild(frontContent);

        const { controls: frontControls, star: frontStar } = createControls(card, folder);
        front.appendChild(frontControls);
        front.appendChild(frontStar);

        const flipFront = document.createElement('button');
        flipFront.textContent = '🔄 Flip';
        flipFront.className = 'flip-btn';
        flipFront.addEventListener('click', e => {
            e.stopPropagation();
            wrapper.classList.toggle('flipped');
        });
        front.appendChild(flipFront);

        const back = document.createElement('div');
        back.className = 'card-back';
        back.innerHTML = `<h3>Answer</h3><div style="flex-grow: 1; font-size: 1rem; line-height: 1.4;">${card.answer}</div>`;

        const { controls: backControls, star: backStar } = createControls(card, folder);
        back.appendChild(backControls);
        back.appendChild(backStar);

        const flipBack = document.createElement('button');
        flipBack.textContent = '🔄 Flip';
        flipBack.className = 'flip-btn';
        flipBack.addEventListener('click', e => {
            e.stopPropagation();
            wrapper.classList.toggle('flipped');
        });
        back.appendChild(flipBack);

        inner.append(front, back);
        wrapper.append(inner);

        return wrapper;
    }

    function render() {
        foldersContainer.innerHTML = '';
        
        // Store current open states
        const openStates = {};
        document.querySelectorAll('.folder-content.active').forEach(content => {
            const folder = content.closest('.folder').querySelector('h3').textContent;
            openStates[folder] = true;
        });

        Object.entries(cardsByFolder).forEach(([folder, cards]) => {
            if (!cards || cards.length === 0) return;

            const fdiv = document.createElement('div');
            fdiv.className = 'folder';

            const header = document.createElement('div');
            header.className = 'folder-header';
            
            const title = document.createElement('h3');
            title.textContent = folder;

            const actions = document.createElement('div');
            actions.className = 'actions';
            
            // Add star filter toggle
            const starredCount = cards.filter(c => c.starred).length;
            const starFilter = document.createElement('button');
            starFilter.className = `filter-toggle ${folderFilters[folder] ? 'active' : ''}`;
            starFilter.innerHTML = `★ ${starredCount}`;
            starFilter.title = folderFilters[folder] ? 'Show all cards' : 'Show only starred cards';
            
            starFilter.addEventListener('click', e => {
                e.stopPropagation();
                folderFilters[folder] = !folderFilters[folder];
                render();
            });
            
            actions.appendChild(starFilter);
            
            // Add rename and delete buttons
            actions.innerHTML += '<button class="rename" title="Rename folder">✏️</button><button class="delete" title="Delete folder">🗑️</button>';

            const icon = document.createElement('span');
            icon.className = 'toggle-icon';
            icon.textContent = '+';

            header.append(title, actions, icon);

            const content = document.createElement('div');
            content.className = 'folder-content';
            
            // Restore open state
            if (openStates[folder]) {
                content.classList.add('active');
                icon.textContent = '−';
            }

            // Filter cards based on star filter
            const cardsToShow = folderFilters[folder] ? cards.filter(c => c.starred) : cards;
            cardsToShow.forEach(c => content.appendChild(createCardElement(c, folder)));

            // Toggle folder - only on header click, not action buttons
            const toggleFolder = (e) => {
                if (e.target.closest('.actions')) return;
                e.stopPropagation();
                const active = content.classList.toggle('active');
                icon.textContent = active ? '−' : '+';
            };

            header.addEventListener('click', toggleFolder);

            // Folder actions
            const deleteBtn = actions.querySelector('.delete');
            const renameBtn = actions.querySelector('.rename');

            if (deleteBtn) {
                deleteBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    if (confirm(`Delete folder '${folder}' and all its flashcards?`)) {
                        delete cardsByFolder[folder];
                        delete folderFilters[folder];
                        saveData();
                        render();
                    }
                });
            }

            if (renameBtn) {
                renameBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    const name = prompt('Enter new folder name:', folder);
                    if (name && name.trim() && name.trim() !== folder) {
                        const newName = name.trim();
                        cardsByFolder[newName] = cardsByFolder[folder];
                        folderFilters[newName] = folderFilters[folder];
                        delete cardsByFolder[folder];
                        delete folderFilters[folder];
                        saveData();
                        render();
                    }
                });
            }

            fdiv.append(header, content);
            foldersContainer.append(fdiv);
        });
    }

    async function extractText(file) {
        const { data: { text } } = await Tesseract.recognize(file, 'eng');
        return text;
    }

    async function callLLM(prompt) {
        const key = apiKeyInput.value.trim();
        if (!key) return alert('Please enter your OpenAI API key');
        
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 500
            })
        });
        
        if (!res.ok) {
            console.error(await res.text());
            return alert(`LLM request failed: ${res.status}`);
        }
        
        return (await res.json()).choices[0].message.content;
    }

    function parseQA(text) {
        const pairs = [];
        const lines = text.split(/\r?\n/);
        let q = '', a = '';
        
        lines.forEach(line => {
            if (line.startsWith('Q:')) {
                if (q && a) {
                    pairs.push({ id: uuid(), question: q.trim(), answer: a.trim(), starred: false, tags: [] });
                    a = '';
                }
                q = line.slice(2).trim();
            } else if (line.startsWith('A:')) {
                a = line.slice(2).trim();
            } else {
                if (a) a += ' ' + line.trim();
                else if (q) q += ' ' + line.trim();
            }
        });
        
        if (q && a) pairs.push({ id: uuid(), question: q.trim(), answer: a.trim(), starred: false, tags: [] });
        return pairs;
    }

    extractBtn.addEventListener('click', async () => {
        const folder = folderInput.value.trim() || 'General';
        const file = imageInput.files[0];
        if (!file) return alert('Please upload an image');
        
        try {
            extractBtn.textContent = 'Processing...';
            extractBtn.disabled = true;
            
            const text = await extractText(file);
            const output = await callLLM(`Convert this text into JSON array of objects with 'question' and 'answer' properties: ${text}`);
            const newCards = JSON.parse(output).map(c => ({
                id: uuid(),
                question: c.question,
                answer: c.answer,
                starred: false,
                tags: []
            }));
            
            cardsByFolder[folder] = (cardsByFolder[folder] || []).concat(newCards);
            saveData();
            render();
            
            imageInput.value = '';
        } catch (e) {
            console.error(e);
            alert('Error processing image. Check console for details.');
        } finally {
            extractBtn.textContent = '📷 Extract from Image';
            extractBtn.disabled = false;
        }
    });

    generateBtn.addEventListener('click', () => {
        const folder = folderInput.value.trim() || 'General';
        const text = bulkText.value.trim();
        
        if (!text) return alert('Please enter some Q:A pairs');
        
        const qa = parseQA(text);
        if (qa.length === 0) return alert('No valid Q:A pairs found. Use format: Q: question A: answer');
        
        cardsByFolder[folder] = (cardsByFolder[folder] || []).concat(qa);
        saveData();
        render();
        
        bulkText.value = '';
    });

    render();
});