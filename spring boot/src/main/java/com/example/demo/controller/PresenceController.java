package com.example.demo.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.example.demo.service.PresenceService;

@RestController
@RequestMapping({"/api/presence", "/api/posts/presence"})
@CrossOrigin(origins = {"https://herapherigoods.in", "https://www.herapherigoods.in", "https://api.herapherigoods.in", "http://localhost:8080", "http://localhost:5500", "http://127.0.0.1:5500"})
public class PresenceController {

    private final PresenceService presenceService;

    public PresenceController(PresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> stream(@RequestParam(name = "page", defaultValue = "posts") String page) {
        SseEmitter emitter = presenceService.add(page);
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.CACHE_CONTROL, "no-cache, no-transform");
        headers.set(HttpHeaders.CONNECTION, "keep-alive");
        headers.set("X-Accel-Buffering", "no"); // disable buffering on some proxies (nginx)
        return new ResponseEntity<>(emitter, headers, HttpStatus.OK);
    }

    @GetMapping(path = "/count")
    public ResponseEntity<java.util.Map<String, Object>> count(@RequestParam(name = "page", defaultValue = "posts") String page) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.CACHE_CONTROL, "no-cache");
        return new ResponseEntity<>(java.util.Map.of("page", page, "count", presenceService.count(page)), headers, HttpStatus.OK);
    }
}


